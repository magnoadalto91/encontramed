'use strict';

const router = require('express').Router();
const svc = require('./hospitais.service');
const auth = require('../../middlewares/auth.middleware');
const hospitalMw = require('../../middlewares/hospital.middleware');
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

// ─── Rotas literais ANTES de parâmetros dinâmicos ────────────────────────────

// Perfil
router.get('/me',      auth, hospitalMw, wrap(async (req, res) => res.json(await svc.getPerfil(req.userId))));
router.put('/me',      auth, hospitalMw, wrap(async (req, res) => res.json(await svc.updatePerfil(req.userId, req.body))));
router.get('/perfil',  auth, hospitalMw, wrap(async (req, res) => res.json(await svc.getPerfil(req.userId))));
router.put('/perfil',  auth, hospitalMw, wrap(async (req, res) => res.json(await svc.updatePerfil(req.userId, req.body))));

// Dashboard (alias /me/stats kept for web portal compatibility)
router.get('/dashboard',  auth, hospitalMw, wrap(async (req, res) => res.json(await svc.getDashboardStats(req.userId))));
router.get('/me/stats',   auth, hospitalMw, wrap(async (req, res) => res.json(await svc.getDashboardStats(req.userId))));

// CNES — rota pública (dados públicos do governo, usada também no cadastro antes do login)
router.get('/cnes/consultar', wrap(async (req, res) => {
  const cnpj = (req.query.cnpj || '').replace(/\D/g, '');
  if (!cnpj || cnpj.length !== 14) return res.status(400).json({ error: 'CNPJ inválido' });
  const data = await svc.buscarCNPJ(cnpj);
  if (!data) return res.status(404).json({ error: 'Nenhum dado encontrado para este CNPJ' });
  res.json(data);
}));

// Vincular dados CNES ao perfil do hospital logado
router.post('/cnes/vincular', auth, hospitalMw, wrap(async (req, res) => {
  const { cnpj } = req.body;
  if (!cnpj) return res.status(400).json({ error: 'CNPJ obrigatório' });
  const data = await svc.vincularCNES(req.userId, cnpj);
  res.json(data);
}));

// Rota legada (mantida para compatibilidade)
router.get('/buscar-cnpj/:cnpj', wrap(async (req, res) => {
  const cnpj = req.params.cnpj.replace(/\D/g, '');
  const data = await svc.buscarCNPJ(cnpj);
  if (!data) return res.status(404).json({ error: 'CNPJ não encontrado no CNES' });
  res.json(data);
}));

module.exports = router;
