'use strict';

const router = require('express').Router();
const svc = require('./escalas.service');
const auth = require('../../middlewares/auth.middleware');
const hospitalMw = require('../../middlewares/hospital.middleware');
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

router.get('/', auth, hospitalMw, wrap(async (req, res) => res.json(await svc.listar(req.userId))));
router.post('/', auth, hospitalMw, wrap(async (req, res) => res.status(201).json(await svc.criar(req.body, req.userId))));
router.get('/:id', auth, wrap(async (req, res) => res.json(await svc.getById(req.params.id, req.userId))));
router.post('/:id/pausar', auth, hospitalMw, wrap(async (req, res) => res.json(await svc.pausar(req.params.id, req.userId))));
router.post('/:id/reativar', auth, hospitalMw, wrap(async (req, res) => res.json(await svc.reativar(req.params.id, req.userId))));
router.post('/:id/gerar', auth, hospitalMw, wrap(async (req, res) => {
  const gerados = await svc.generatePlantoes(Number(req.params.id), req.body.horizonDays || 60);
  res.json({ gerados });
}));

module.exports = router;
