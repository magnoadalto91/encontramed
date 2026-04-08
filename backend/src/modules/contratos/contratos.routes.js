'use strict';

const router = require('express').Router();
const auth = require('../../middlewares/auth.middleware');
const { PrismaClient } = require('@prisma/client');
const { verificarWebhook } = require('./clicksign.service');
const { getPresignedUrl } = require('../../config/r2');
const prisma = new PrismaClient();
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

router.get('/meus', auth, wrap(async (req, res) => {
  const medico = await prisma.medicos.findFirst({ where: { usuarioId: req.userId } });
  const contratos = await prisma.contratos.findMany({
    where: { medicoId: medico?.id },
    include: { hospital: { select: { razaoSocial: true, nomeFantasia: true } }, plantao: { select: { dataInicio: true, dataFim: true } } },
    orderBy: { criadoEm: 'desc' },
  });
  res.json(contratos);
}));

router.get('/:id', auth, wrap(async (req, res) => {
  const contrato = await prisma.contratos.findUnique({ where: { id: Number(req.params.id) } });
  if (!contrato) return res.status(404).json({ error: 'Contrato não encontrado' });
  res.json(contrato);
}));

router.get('/:id/url-assinatura', auth, wrap(async (req, res) => {
  const contrato = await prisma.contratos.findUnique({ where: { id: Number(req.params.id) } });
  if (!contrato) return res.status(404).json({ error: 'Contrato não encontrado' });
  res.json({ url: contrato.clicksignSignUrl });
}));

// Clicksign webhook — no auth, verify by secret key
router.post('/:id/webhook-clicksign', wrap(async (req, res) => {
  const key = req.headers['x-clicksign-hmac-sha256'] || req.query.access_token;
  if (!verificarWebhook(req.body, key)) return res.status(401).json({ error: 'Webhook inválido' });

  const { event } = req.body;
  if (event?.name === 'auto_close') {
    await prisma.contratos.update({
      where: { clicksignDocId: event.document?.key },
      data: { status: 'ASSINADO', assinadoEm: new Date() },
    });

    // Mark medico as having signed first contract
    const contrato = await prisma.contratos.findFirst({ where: { clicksignDocId: event.document?.key } });
    if (contrato) {
      await prisma.medicos.update({ where: { id: contrato.medicoId }, data: { primeiroContratoAssinado: true } });
    }
  }

  res.json({ received: true });
}));

router.get('/:id/download', auth, wrap(async (req, res) => {
  const contrato = await prisma.contratos.findUnique({ where: { id: Number(req.params.id) } });
  if (!contrato?.urlAssinado) return res.status(404).json({ error: 'PDF não disponível' });
  const url = await getPresignedUrl(contrato.urlAssinado, 300);
  res.json({ url });
}));

module.exports = router;
