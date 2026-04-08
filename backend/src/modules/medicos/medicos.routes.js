'use strict';

const router = require('express').Router();
const svc = require('./medicos.service');
const auth = require('../../middlewares/auth.middleware');
const medicoMw = require('../../middlewares/medico.middleware');
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

router.get('/perfil', auth, medicoMw, wrap(async (req, res) => res.json(await svc.getPerfil(req.userId))));
router.put('/perfil', auth, medicoMw, wrap(async (req, res) => res.json(await svc.updatePerfil(req.userId, req.body))));
router.put('/localizacao', auth, medicoMw, wrap(async (req, res) => {
  const { latitude, longitude } = req.body;
  res.json(await svc.updateLocalizacao(req.userId, latitude, longitude));
}));
router.get('/especialidades', auth, medicoMw, wrap(async (req, res) => {
  const p = await svc.getPerfil(req.userId);
  res.json(p.especialidades);
}));
router.post('/especialidades', auth, medicoMw, wrap(async (req, res) => {
  const { especialidadeId, rqeNumero, principal } = req.body;
  res.status(201).json(await svc.addEspecialidade(req.userId, especialidadeId, rqeNumero, principal));
}));
router.delete('/especialidades/:espId', auth, medicoMw, wrap(async (req, res) => {
  await svc.removeEspecialidade(req.userId, req.params.espId);
  res.json({ success: true });
}));
router.get('/meus-plantoes', auth, medicoMw, wrap(async (req, res) => {
  const { status, page, limit } = req.query;
  res.json(await svc.getMeusPlantoes(req.userId, status, page, limit));
}));
router.get('/candidaturas', auth, medicoMw, wrap(async (req, res) => {
  res.json(await svc.getCandidaturas(req.userId, req.query.page, req.query.limit));
}));
router.get('/financeiro', auth, medicoMw, wrap(async (req, res) => {
  const { mes, ano } = req.query;
  res.json(await svc.getFinanceiro(req.userId, mes, ano));
}));
router.post('/push-token', auth, wrap(async (req, res) => {
  const { pushToken } = req.body;
  await svc.updatePushToken(req.userId, pushToken);
  res.json({ success: true });
}));

module.exports = router;
