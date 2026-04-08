'use strict';

const router = require('express').Router();
const svc = require('./bids.service');
const auth = require('../../middlewares/auth.middleware');
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

router.post('/', auth, wrap(async (req, res) => {
  const { plantaoId, valorProposto, mensagem } = req.body;
  res.status(201).json(await svc.criarBid(plantaoId, req.userId, valorProposto, mensagem));
}));
router.post('/:id/aceitar', auth, wrap(async (req, res) => res.json(await svc.aceitarBid(req.params.id, req.userId))));
router.post('/:id/rejeitar', auth, wrap(async (req, res) => res.json(await svc.rejeitarBid(req.params.id, req.userId))));

module.exports = router;
