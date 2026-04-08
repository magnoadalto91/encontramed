'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendToUser } = require('../config/websocket');
const logger = require('../utils/logger');

async function run() {
  const agora = new Date();

  const expirados = await prisma.plantoes.findMany({
    where: {
      status: { in: ['ABERTO', 'CANDIDATADO'] },
      prazoConfirmacao: { lt: agora },
    },
    include: {
      candidaturas: {
        where: { status: 'PENDENTE' },
        include: { medico: { include: { usuario: true } } },
      },
    },
  });

  if (!expirados.length) return;

  logger.info(`[expiry.job] ${expirados.length} plantões expirados`);

  for (const plantao of expirados) {
    try {
      await prisma.$transaction([
        prisma.plantoes.update({ where: { id: plantao.id }, data: { status: 'EXPIRADO' } }),
        prisma.candidaturas.updateMany({
          where: { plantaoId: plantao.id, status: 'PENDENTE' },
          data: { status: 'CANCELADA' },
        }),
      ]);

      // Notify all applicants
      for (const cand of plantao.candidaturas) {
        sendToUser(cand.medico.usuario.id, {
          type: 'plantao_cancelado',
          plantaoId: plantao.id,
          message: 'O plantão expirou sem confirmação.',
        });
      }
    } catch (err) {
      logger.error(`[expiry.job] Erro no plantão ${plantao.id}:`, err.message);
    }
  }

  await prisma.$disconnect();
}

module.exports = { run };
