'use strict';

const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Auth middleware: validates JWT, verifies session is still active in DB,
 * updates ultimoUso asynchronously (non-blocking), sets req.userId and req.role.
 *
 * A 401 with { sessionExpired: true } means the client should clear its token and redirect to login.
 */
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.replace('Bearer ', '').trim();

  if (!token) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Token inválido', sessionExpired: true });
  }

  // Tokens issued before session management was added won't have sid → force re-login
  if (!decoded.sid) {
    return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.', sessionExpired: true });
  }

  // Validate session is active in DB
  let sessao;
  try {
    sessao = await prisma.sessoes.findFirst({
      where: { sessionId: decoded.sid, ativo: true },
    });
  } catch (err) {
    return next(err);
  }

  if (!sessao) {
    return res.status(401).json({ error: 'Sessão encerrada', sessionExpired: true });
  }

  // Update ultimoUso asynchronously — does not block the request
  prisma.sessoes
    .update({ where: { id: sessao.id }, data: { ultimoUso: new Date() } })
    .catch(() => {});

  req.userId = decoded.userId;
  req.role = decoded.role;
  req.sid = decoded.sid;

  next();
}

module.exports = authMiddleware;
