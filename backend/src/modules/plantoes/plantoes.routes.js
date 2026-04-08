'use strict';

const router = require('express').Router();
const svc = require('./plantoes.service');
const auth = require('../../middlewares/auth.middleware');
const hospitalMw = require('../../middlewares/hospital.middleware');
const medicoMw = require('../../middlewares/medico.middleware');
const adminMw = require('../../middlewares/admin.middleware');
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

// ⚠️ Literal routes BEFORE dynamic /:id
router.get('/disponiveis', auth, wrap(async (req, res) => {
  res.json(await svc.listarDisponiveis(req.query, req.userId));
}));
router.get('/disponiveis/mapa', auth, wrap(async (req, res) => {
  const result = await svc.listarDisponiveis({ ...req.query, limit: 200 }, req.userId);
  const pins = (result.plantoes || []).map(p => ({
    id: p.id, latitude: p.latitude, longitude: p.longitude,
    status: p.status, urgente: p.urgente, valorBase: p.valorBase,
  }));
  res.json(pins);
}));
router.get('/meus', auth, hospitalMw, wrap(async (req, res) => {
  res.json(await svc.getMeusPlantoes(req.userId));
}));

// POST create
router.post('/', auth, hospitalMw, wrap(async (req, res) => {
  res.status(201).json(await svc.criarPlantao(req.body, req.userId));
}));

// Dynamic /:id routes
router.get('/:id', auth, wrap(async (req, res) => {
  res.json(await svc.getById(req.params.id, req.userId, req.role));
}));
router.delete('/:id', auth, wrap(async (req, res) => {
  res.json(await svc.cancelarPlantao(req.params.id, req.userId, req.role));
}));
router.post('/:id/confirmar/:candidaturaId', auth, hospitalMw, wrap(async (req, res) => {
  res.json(await svc.confirmarCandidatura(req.params.id, req.params.candidaturaId, req.userId));
}));
router.post('/:id/realizar', auth, hospitalMw, wrap(async (req, res) => {
  res.json(await svc.marcarRealizado(req.params.id, req.userId));
}));
router.post('/:id/notificar-raio', auth, adminMw, wrap(async (req, res) => {
  await svc.notificarMedicosProximos(Number(req.params.id), req.body.raioKm || 20);
  res.json({ success: true });
}));

module.exports = router;
