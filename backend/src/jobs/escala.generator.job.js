'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const escalaSvc = require('../modules/escalas/escalas.service');
const logger = require('../utils/logger');

async function run() {
  const escalas = await prisma.escalas.findMany({
    where: { ativo: true, OR: [{ dataFim: null }, { dataFim: { gt: new Date() } }] },
  });

  logger.info(`[escala.job] Gerando plantões para ${escalas.length} escalas ativas`);
  let totalGerados = 0;

  for (const escala of escalas) {
    try {
      const gerados = await escalaSvc.generatePlantoes(escala.id, 60);
      totalGerados += gerados || 0;
    } catch (err) {
      logger.error(`[escala.job] Erro na escala ${escala.id}:`, err.message);
    }
  }

  logger.info(`[escala.job] ${totalGerados} plantões gerados no total`);
  await prisma.$disconnect();
}

module.exports = { run };
