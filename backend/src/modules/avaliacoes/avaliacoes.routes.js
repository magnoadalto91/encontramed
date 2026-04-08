'use strict';
const express = require('express');
const router = express.Router();
const svc = require('./avaliacoes.service');
const authMiddleware = require('../../middlewares/auth.middleware');

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

// GET /api/avaliacoes/pendentes — list plantoes pending rating
router.get('/pendentes', authMiddleware, wrap(async (req, res) => {
  res.json(await svc.getMeusPendentes(req.userId));
}));

// GET /api/avaliacoes/medico/:medicoId
router.get('/medico/:medicoId', authMiddleware, wrap(async (req, res) => {
  res.json(await svc.getAvaliacoesMedico(req.params.medicoId));
}));

// GET /api/avaliacoes/hospital/:hospitalId
router.get('/hospital/:hospitalId', authMiddleware, wrap(async (req, res) => {
  res.json(await svc.getAvaliacoesHospital(req.params.hospitalId));
}));

// POST /api/avaliacoes/:plantaoId — create rating
router.post('/:plantaoId', authMiddleware, wrap(async (req, res) => {
  const av = await svc.criarAvaliacao(req.params.plantaoId, req.userId, req.body);
  res.status(201).json(av);
}));

module.exports = router;
