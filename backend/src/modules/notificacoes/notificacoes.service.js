'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');
const logger = require('../../utils/logger');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

async function criarNotificacao(userId, titulo, corpo, tipo, dadosJson = null) {
  return prisma.notificacoes.create({
    data: { userId, titulo, corpo, tipo, dadosJson },
  });
}

async function enviarPush(userId, titulo, corpo, data = {}) {
  const user = await prisma.usuarios.findUnique({ where: { id: userId }, select: { pushToken: true } });
  if (!user?.pushToken) return;

  try {
    const resp = await axios.post(EXPO_PUSH_URL, {
      to: user.pushToken,
      title: titulo,
      body: corpo,
      data,
      sound: 'default',
      priority: 'high',
    }, { headers: { 'Content-Type': 'application/json' }, timeout: 10000 });

    const ticket = resp.data?.data?.id;
    return ticket;
  } catch (err) {
    logger.warn(`[notificacoes] Falha ao enviar push para userId ${userId}: ${err.message}`);
    return null;
  }
}

async function notificarGrupo(userIds, titulo, corpo, tipo, dadosJson = {}) {
  // Batch push in chunks of 100 (Expo limit)
  const usuarios = await prisma.usuarios.findMany({
    where: { id: { in: userIds }, pushToken: { not: null } },
    select: { id: true, pushToken: true },
  });

  const chunks = [];
  for (let i = 0; i < usuarios.length; i += 100) {
    chunks.push(usuarios.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    const messages = chunk.map(u => ({
      to: u.pushToken,
      title: titulo,
      body: corpo,
      data: dadosJson,
      sound: 'default',
    }));

    try {
      await axios.post(EXPO_PUSH_URL, messages, { timeout: 15000 });
    } catch (err) {
      logger.warn(`[notificacoes] Falha no batch push: ${err.message}`);
    }
  }

  // Create in-app notifications for all users
  await Promise.all(userIds.map(userId =>
    criarNotificacao(userId, titulo, corpo, tipo, dadosJson).catch(() => {})
  ));
}

async function listar(userId, page = 1, limit = 30) {
  const skip = (Number(page) - 1) * Number(limit);
  const [notificacoes, total, naoLidas] = await Promise.all([
    prisma.notificacoes.findMany({
      where: { userId },
      skip,
      take: Number(limit),
      orderBy: { criadoEm: 'desc' },
    }),
    prisma.notificacoes.count({ where: { userId } }),
    prisma.notificacoes.count({ where: { userId, lida: false } }),
  ]);
  return { notificacoes, total, naoLidas, page: Number(page), pages: Math.ceil(total / Number(limit)) };
}

async function marcarLida(id, userId) {
  return prisma.notificacoes.updateMany({
    where: { id: Number(id), userId },
    data: { lida: true },
  });
}

async function marcarTodasLidas(userId) {
  return prisma.notificacoes.updateMany({
    where: { userId, lida: false },
    data: { lida: true },
  });
}

async function countNaoLidas(userId) {
  const count = await prisma.notificacoes.count({ where: { userId, lida: false } });
  return { count };
}

module.exports = { criarNotificacao, enviarPush, notificarGrupo, listar, marcarLida, marcarTodasLidas, countNaoLidas };
