'use strict';

const router = require('express').Router();
const svc = require('./hospitais.service');
const auth = require('../../middlewares/auth.middleware');
const hospitalMw = require('../../middlewares/hospital.middleware');
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

// Literal routes BEFORE dynamic /:id
router.get('/perfil', auth, hospitalMw, wrap(async (req, res) => res.json(await svc.getPerfil(req.userId))));
router.put('/perfil', auth, hospitalMw, wrap(async (req, res) => res.json(await svc.updatePerfil(req.userId, req.body))));
router.get('/dashboard', auth, hospitalMw, wrap(async (req, res) => res.json(await svc.getDashboardStats(req.userId))));
router.get('/buscar-cnpj/:cnpj', auth, wrap(async (req, res) => {
  const data = await svc.buscarCNPJ(req.params.cnpj);
  if (!data) return res.status(404).json({ error: 'CNPJ não encontrado no CNES' });
  res.json(data);
}));

module.exports = router;
