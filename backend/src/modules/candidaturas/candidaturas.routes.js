'use strict';

const router = require('express').Router();
const svc = require('./candidaturas.service');
const auth = require('../../middlewares/auth.middleware');
const { candidaturaLimiter } = require('../../config/rateLimiter');
const hospitalMw = require('../../middlewares/hospital.middleware');
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

// ⚠️ Literal routes BEFORE dynamic /:id
router.get('/hospital', auth, hospitalMw, wrap(async (req, res) => {
  res.json(await svc.listarHospital(req.userId, req.query));
}));

router.post('/', auth, candidaturaLimiter, wrap(async (req, res) => {
  const { plantaoId, mensagem } = req.body;
  res.status(201).json(await svc.candidatar(plantaoId, req.userId, mensagem));
}));
router.delete('/:id', auth, wrap(async (req, res) => {
  res.json(await svc.cancelarCandidatura(req.params.id, req.userId));
}));
router.post('/:id/aceitar', auth, wrap(async (req, res) => {
  res.json(await svc.aceitar(req.params.id, req.userId));
}));
router.post('/:id/rejeitar', auth, wrap(async (req, res) => {
  res.json(await svc.rejeitar(req.params.id, req.userId, req.body.motivoRejeicao));
}));

module.exports = router;
