'use strict';

const cron = require('node-cron');
const logger = require('../utils/logger');

const crmValidationJob = require('./crm.validation.job');
const escalaGeneratorJob = require('./escala.generator.job');
const plantaoExpiryJob = require('./plantao.expiry.job');

// 2am daily — CRM revalidation
cron.schedule('0 2 * * *', async () => {
  logger.info('[scheduler] CRM validation job iniciado');
  try { await crmValidationJob.run(); } catch (err) { logger.error('[scheduler] CRM job falhou:', err.message); }
}, { timezone: 'America/Sao_Paulo' });

// 6am daily — Escala generation
cron.schedule('0 6 * * *', async () => {
  logger.info('[scheduler] Escala generator job iniciado');
  try { await escalaGeneratorJob.run(); } catch (err) { logger.error('[scheduler] Escala job falhou:', err.message); }
}, { timezone: 'America/Sao_Paulo' });

// Every 30 minutes — Plantao expiry
cron.schedule('*/30 * * * *', async () => {
  logger.debug('[scheduler] Plantao expiry job iniciado');
  try { await plantaoExpiryJob.run(); } catch (err) { logger.error('[scheduler] Expiry job falhou:', err.message); }
});

// Every 15 minutes — expand push radius for urgent plantoes
cron.schedule('*/15 * * * *', async () => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const plantaoSvc = require('../modules/plantoes/plantoes.service');

    const urgentes = await prisma.plantoes.findMany({
      where: { status: 'ABERTO', urgente: true, notificadoRaio: { lt: 3 } },
    });

    for (const p of urgentes) {
      const raio = p.notificadoRaio === 0 ? 20 : p.notificadoRaio === 1 ? 50 : 200;
      await plantaoSvc.notificarMedicosProximos(p.id, raio);
      await prisma.plantoes.update({ where: { id: p.id }, data: { notificadoRaio: p.notificadoRaio + 1 } });
    }

    await prisma.$disconnect();
  } catch (err) {
    logger.error('[scheduler] Push radius job falhou:', err.message);
  }
});

logger.info('[scheduler] Todos os cron jobs registrados');
