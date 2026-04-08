'use strict';

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// Map: userId (number) → Set of WebSocket connections
// A user may have multiple concurrent connections (web + mobile)
const clients = new Map();

let wss = null;

/**
 * Initialize WebSocket server attached to an existing HTTP server.
 * Authentication: client must send { type: 'auth', token } (JWT) — never userId directly.
 * @param {import('http').Server} server
 */
function initWebSocket(server) {
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    ws._userId = null;
    ws._sid = null;
    ws._isAlive = true;

    ws.on('message', async (raw) => {
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'JSON inválido' }));
        return;
      }

      // Authentication handshake — JWT only, never raw userId
      if (data.type === 'auth') {
        if (!data.token) {
          ws.send(JSON.stringify({ type: 'auth_error', message: 'Token obrigatório' }));
          return;
        }

        let decoded;
        try {
          decoded = jwt.verify(data.token, process.env.JWT_SECRET);
        } catch {
          ws.send(JSON.stringify({ type: 'auth_error', message: 'Token inválido' }));
          ws.close();
          return;
        }

        if (!decoded.sid) {
          ws.send(JSON.stringify({ type: 'auth_error', message: 'Token sem sessão' }));
          ws.close();
          return;
        }

        // Validate that session is still active in DB
        try {
          const sessao = await prisma.sessoes.findFirst({
            where: { sessionId: decoded.sid, ativo: true },
          });

          if (!sessao) {
            ws.send(JSON.stringify({ type: 'auth_error', message: 'Sessão encerrada', sessionExpired: true }));
            ws.close();
            return;
          }
        } catch (err) {
          logger.error('WebSocket: DB error validating session', err);
          ws.send(JSON.stringify({ type: 'auth_error', message: 'Erro interno' }));
          ws.close();
          return;
        }

        ws._userId = decoded.userId;
        ws._sid = decoded.sid;

        // Register in clients map
        if (!clients.has(decoded.userId)) {
          clients.set(decoded.userId, new Set());
        }
        clients.get(decoded.userId).add(ws);

        ws.send(JSON.stringify({ type: 'auth_ok' }));
        logger.debug(`WebSocket: user ${decoded.userId} connected (sid: ${decoded.sid})`);
        return;
      }

      // Require auth for all other message types
      if (!ws._userId) {
        ws.send(JSON.stringify({ type: 'error', message: 'Não autenticado' }));
        return;
      }

      if (data.type === 'pong') {
        ws._isAlive = true;
      }
    });

    ws.on('close', () => {
      if (ws._userId) {
        const userSockets = clients.get(ws._userId);
        if (userSockets) {
          userSockets.delete(ws);
          if (userSockets.size === 0) {
            clients.delete(ws._userId);
          }
        }
        logger.debug(`WebSocket: user ${ws._userId} disconnected`);
      }
    });

    ws.on('error', (err) => {
      logger.error('WebSocket connection error:', err.message);
    });
  });

  // Keepalive ping every 30 seconds to detect dead connections
  const pingInterval = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((ws) => {
      if (ws._isAlive === false) {
        if (ws._userId) {
          const userSockets = clients.get(ws._userId);
          if (userSockets) {
            userSockets.delete(ws);
            if (userSockets.size === 0) clients.delete(ws._userId);
          }
        }
        return ws.terminate();
      }
      ws._isAlive = false;
      ws.send(JSON.stringify({ type: 'ping' }));
    });
  }, 30000);

  wss.on('close', () => clearInterval(pingInterval));

  logger.info('WebSocket server initialized');
  return wss;
}

/**
 * Send a JSON message to all active connections of a specific user.
 * @param {number} userId
 * @param {object} data - JSON-serializable payload
 */
function sendToUser(userId, data) {
  const userSockets = clients.get(userId);
  if (!userSockets || userSockets.size === 0) return;

  const payload = JSON.stringify(data);
  userSockets.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
}

/**
 * Broadcast a message to ALL connected authenticated users.
 * @param {object} data - JSON-serializable payload
 */
function broadcast(data) {
  const payload = JSON.stringify(data);
  if (!wss) return;

  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN && ws._userId) {
      ws.send(payload);
    }
  });
}

module.exports = { initWebSocket, sendToUser, broadcast };
