'use strict';

const router = require('express').Router();
const svc = require('./financeiro.service');
const auth = require('../../middlewares/auth.middleware');
const adminMw = require('../../middlewares/admin.middleware');
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

// Literal routes BEFORE dynamic /:id
router.get('/extrato', auth, wrap(async (req, res) => {
  const { mes, ano } = req.query;
  res.json(await svc.getExtrato(req.userId, mes, ano));
}));
router.get('/extrato/hospital', auth, wrap(async (req, res) => {
  const { mes, ano } = req.query;
  res.json(await svc.getExtratoHospital(req.userId, mes, ano));
}));

// NF routes
router.post('/nfe/preparar/:transacaoId', auth, wrap(async (req, res) => {
  res.json(await svc.prepararNFe(req.params.transacaoId, req.userId));
}));
router.post('/nfe/emitir/:transacaoId', auth, wrap(async (req, res) => {
  res.json(await svc.emitirNFe(req.params.transacaoId, req.userId));
}));

// Admin
router.post('/pagamento/:transacaoId/confirmar', auth, adminMw, wrap(async (req, res) => {
  res.json(await svc.confirmarPagamento(req.params.transacaoId, req.userId));
}));

module.exports = router;
