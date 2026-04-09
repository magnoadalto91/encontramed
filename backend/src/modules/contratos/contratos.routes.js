'use strict';
const express = require('express');
const router = express.Router();
const svc = require('./contratos.service');
const auth = require('../../middlewares/auth.middleware');
const { PrismaClient } = require('@prisma/client');
const { verificarWebhook } = require('./clicksign.service');
const { getPresignedUrl } = require('../../config/r2');
const prisma = new PrismaClient();

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

// ─── Literal routes BEFORE dynamic /:id / /:plantaoId ───────────────────────

// GET /api/contratos/meus — list contracts for logged-in medico
router.get('/meus', auth, wrap(async (req, res) => {
  const medico = await prisma.medicos.findFirst({ where: { usuarioId: req.userId } });
  const contratos = await prisma.contratos.findMany({
    where: { medicoId: medico?.id },
    include: {
      hospital: { select: { razaoSocial: true, nomeFantasia: true } },
      plantao: { select: { dataInicio: true, dataFim: true } },
    },
    orderBy: { criadoEm: 'desc' },
  });
  res.json(contratos);
}));

// ─── Routes by plantaoId (PDF generation + 1-click accept) ──────────────────

// GET /api/contratos/:plantaoId/pdf — download PDF (accepts ?token= for browser open)
router.get('/:plantaoId/pdf', (req, res, next) => {
  // Allow token from query string (for window.open in browser)
  if (req.query.token && !req.headers.authorization) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  auth(req, res, next);
}, wrap(async (req, res) => {
  const pdf = await svc.gerarPDF(req.params.plantaoId, req.userId);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="contrato-plantao-${req.params.plantaoId}.pdf"`,
  });
  res.send(pdf);
}));

// GET /api/contratos/:plantaoId/status
router.get('/:plantaoId/status', auth, wrap(async (req, res) => {
  res.json(await svc.getStatus(req.params.plantaoId, req.userId));
}));

// POST /api/contratos/:plantaoId/aceitar — 1-click accept
router.post('/:plantaoId/aceitar', auth, wrap(async (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
  const ua = req.headers['user-agent'];
  res.json(await svc.aceitarContrato(req.params.plantaoId, req.userId, ip, ua));
}));

// ─── Routes by contrato id ───────────────────────────────────────────────────

// GET /api/contratos/:id
router.get('/:id', auth, wrap(async (req, res) => {
  const contrato = await prisma.contratos.findUnique({ where: { id: Number(req.params.id) } });
  if (!contrato) return res.status(404).json({ error: 'Contrato não encontrado' });
  res.json(contrato);
}));

// GET /api/contratos/:id/url-assinatura
router.get('/:id/url-assinatura', auth, wrap(async (req, res) => {
  const contrato = await prisma.contratos.findUnique({ where: { id: Number(req.params.id) } });
  if (!contrato) return res.status(404).json({ error: 'Contrato não encontrado' });
  res.json({ url: contrato.clicksignSignUrl });
}));

// POST /api/contratos/:id/webhook-clicksign — no auth, verify by secret key
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

// GET /api/contratos/:id/download
router.get('/:id/download', auth, wrap(async (req, res) => {
  const contrato = await prisma.contratos.findUnique({ where: { id: Number(req.params.id) } });
  if (!contrato?.urlAssinado) return res.status(404).json({ error: 'PDF não disponível' });
  const url = await getPresignedUrl(contrato.urlAssinado, 300);
  res.json({ url });
}));

module.exports = router;
