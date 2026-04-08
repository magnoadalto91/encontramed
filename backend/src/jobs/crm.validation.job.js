'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crmScraper = require('../modules/medicos/crm.scraper');
const { sendToUser } = require('../config/websocket');
const logger = require('../utils/logger');

async function run() {
  const ontemMeio = new Date(Date.now() - 24 * 3600 * 1000);

  const medicos = await prisma.medicos.findMany({
    where: {
      crm: { not: null },
      crmUf: { not: null },
      crmStatus: { in: ['ATIVO', 'NAO_VERIFICADO'] },
      OR: [{ crmUltimaVerif: null }, { crmUltimaVerif: { lt: ontemMeio } }],
    },
    include: { usuario: true },
    take: 50, // Process max 50 per run to respect CFM rate limits
  });

  logger.info(`[crm.job] Validando ${medicos.length} médicos`);
  let atualizados = 0;
  let suspensoes = 0;

  for (const medico of medicos) {
    try {
      const resultado = await crmScraper.validarCRM(medico.crm, medico.crmUf);
      const statusAnterior = medico.crmStatus;

      await prisma.medicos.update({
        where: { id: medico.id },
        data: { crmStatus: resultado.status, crmUltimaVerif: new Date() },
      });

      atualizados++;

      // CRM became suspended — cascade consequences
      if (resultado.status === 'SUSPENSO' && statusAnterior !== 'SUSPENSO') {
        suspensoes++;
        logger.warn(`[crm.job] CRM suspenso: ${medico.crm}/${medico.crmUf} (medicoId: ${medico.id})`);

        // Cancel pending candidaturas
        await prisma.candidaturas.updateMany({
          where: { medicoId: medico.id, status: 'PENDENTE' },
          data: { status: 'CANCELADA' },
        });

        // Notify medico
        sendToUser(medico.usuarioId, {
          type: 'crm_status_alterado',
          status: resultado.status,
          message: 'Seu CRM foi suspenso. Suas candidaturas pendentes foram canceladas.',
        });

        // Notify all admin users
        const admins = await prisma.usuarios.findMany({ where: { role: 'ADMIN', ativo: true } });
        for (const admin of admins) {
          sendToUser(admin.id, {
            type: 'alerta_crm_suspenso',
            medicoId: medico.id,
            nome: medico.usuario.nomeCompleto,
            crm: `${medico.crm}/${medico.crmUf}`,
          });
        }
      }

      // Throttle to avoid hammering CFM portal
      await new Promise(r => setTimeout(r, 2000));

    } catch (err) {
      logger.error(`[crm.job] Erro ao validar médico ${medico.id}:`, err.message);
      // Don't stop the batch — skip this one and continue
    }
  }

  logger.info(`[crm.job] Concluído: ${atualizados} atualizados, ${suspensoes} suspensões`);
  await prisma.$disconnect();
}

module.exports = { run };
