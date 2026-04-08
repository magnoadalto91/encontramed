'use strict';

const { PrismaClient } = require('@prisma/client');
const { sendToUser } = require('../../config/websocket');
const logger = require('../../utils/logger');

const prisma = new PrismaClient();

/**
 * Verifica se o usuário tem acesso ao chat de um plantão.
 * Hospital dono do plantão ou médico confirmado/candidatado têm acesso.
 */
async function _verificarAcesso(plantaoId, userId, role) {
  const plantao = await prisma.plantoes.findUnique({
    where: { id: Number(plantaoId) },
    include: {
      hospital: { select: { usuarioId: true } },
      medico:   { select: { usuarioId: true } },
      candidaturas: { where: { medico: { usuarioId: userId } }, select: { id: true } },
    },
  });

  if (!plantao) throw Object.assign(new Error('Plantão não encontrado'), { status: 404 });

  const isHospital = plantao.hospital.usuarioId === userId;
  const isMedicoConfirmado = plantao.medico?.usuarioId === userId;
  const temCandidatura = role === 'MEDICO' && plantao.candidaturas.length > 0;

  if (!isHospital && !isMedicoConfirmado && !temCandidatura) {
    throw Object.assign(new Error('Sem acesso a este chat'), { status: 403 });
  }

  return plantao;
}

async function getMensagens(plantaoId, userId, role) {
  await _verificarAcesso(plantaoId, userId, role);

  return prisma.mensagens_plantao.findMany({
    where: { plantaoId: Number(plantaoId) },
    include: {
      autor: { select: { id: true, nomeCompleto: true, role: true } },
    },
    orderBy: { criadoEm: 'asc' },
  });
}

async function enviarMensagem(plantaoId, userId, role, texto) {
  if (!texto || !texto.trim()) {
    throw Object.assign(new Error('Mensagem não pode ser vazia'), { status: 400 });
  }

  const plantao = await _verificarAcesso(plantaoId, userId, role);

  const mensagem = await prisma.mensagens_plantao.create({
    data: {
      plantaoId: Number(plantaoId),
      autorId:   userId,
      texto:     texto.trim(),
    },
    include: {
      autor: { select: { id: true, nomeCompleto: true, role: true } },
    },
  });

  // Notify the other party via WebSocket
  const outroUserId = plantao.hospital.usuarioId === userId
    ? plantao.medico?.usuarioId
    : plantao.hospital.usuarioId;

  if (outroUserId) {
    try {
      sendToUser(outroUserId, {
        type: 'nova_mensagem_chat',
        plantaoId: Number(plantaoId),
        mensagem,
      });
    } catch (err) {
      logger.warn('[chat] WebSocket notify failed:', err.message);
    }
  }

  return mensagem;
}

module.exports = { getMensagens, enviarMensagem };
