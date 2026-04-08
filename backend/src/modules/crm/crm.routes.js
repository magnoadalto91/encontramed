'use strict';

const router = require('express').Router();
const { validarCrm, validarEPersistir } = require('./crm.service');
const auth = require('../../middlewares/auth.middleware');
const logger = require('../../utils/logger');

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

/**
 * GET /api/crm/validar?crm=123456&uf=SP
 * Public endpoint — validate without persisting (used during registration preview).
 * Does NOT require auth. Rate limited by Express rate limiter upstream.
 * Optionally accepts header X-Captcha-Token for CFM Portal fallback.
 */
router.get('/validar', wrap(async (req, res) => {
  const { crm, uf } = req.query;
  const captchaToken = req.headers['x-captcha-token'] || null;

  const resultado = await validarCrm(crm, uf, captchaToken);
  res.json(resultado);
}));

/**
 * POST /api/crm/vincular
 * Auth required — validate and persist CRM data for the logged-in médico.
 * Also syncs especialidades from CFM.
 * Body: { crm, uf, captchaToken? }
 */
router.post('/vincular', auth, wrap(async (req, res) => {
  const { crm, uf, captchaToken } = req.body;
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  const medico = await prisma.medicos.findFirst({ where: { usuarioId: req.userId } });
  if (!medico) return res.status(404).json({ error: 'Perfil médico não encontrado' });

  const resultado = await validarEPersistir(medico.id, crm, uf, captchaToken || null);
  res.json(resultado);
}));

/**
 * POST /api/crm/revalidar/:medicoId
 * Admin only — force re-validation of a specific médico.
 */
router.post('/revalidar/:medicoId', auth, wrap(async (req, res) => {
  if (req.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado' });

  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const medico = await prisma.medicos.findUnique({
    where: { id: Number(req.params.medicoId) },
  });
  if (!medico) return res.status(404).json({ error: 'Médico não encontrado' });
  if (!medico.crm || !medico.crmUf) return res.status(400).json({ error: 'Médico não tem CRM cadastrado' });

  const resultado = await validarEPersistir(medico.id, medico.crm, medico.crmUf, null, true);
  res.json(resultado);
}));

module.exports = router;
