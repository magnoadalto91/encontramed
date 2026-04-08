'use strict';

const router = require('express').Router();
const svc = require('./trocas.service');
const auth = require('../../middlewares/auth.middleware');
const hospitalMw = require('../../middlewares/hospital.middleware');
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

router.post('/', auth, wrap(async (req, res) => res.status(201).json(await svc.solicitarTroca(req.body, req.userId))));
router.get('/enviadas', auth, wrap(async (req, res) => res.json(await svc.listarEnviadas(req.userId))));
router.get('/recebidas', auth, wrap(async (req, res) => res.json(await svc.listarRecebidas(req.userId))));
router.get('/hospital', auth, hospitalMw, wrap(async (req, res) => res.json(await svc.listarPorHospital(req.userId))));
router.post('/:id/aprovar-hospital', auth, hospitalMw, wrap(async (req, res) => res.json(await svc.aprovarHospital(req.params.id, req.userId))));
router.post('/:id/rejeitar-hospital', auth, hospitalMw, wrap(async (req, res) => res.json(await svc.rejeitarHospital(req.params.id, req.userId, req.body.motivoRejeicao))));

module.exports = router;
