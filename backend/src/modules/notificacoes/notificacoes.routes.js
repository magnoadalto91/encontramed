'use strict';

const router = require('express').Router();
const svc = require('./notificacoes.service');
const auth = require('../../middlewares/auth.middleware');
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

// Literal routes BEFORE dynamic /:id
router.get('/', auth, wrap(async (req, res) => res.json(await svc.listar(req.userId, req.query.page, req.query.limit))));
router.get('/count', auth, wrap(async (req, res) => res.json(await svc.countNaoLidas(req.userId))));
router.put('/todas-lidas', auth, wrap(async (req, res) => { await svc.marcarTodasLidas(req.userId); res.json({ success: true }); }));
router.put('/:id/lida', auth, wrap(async (req, res) => { await svc.marcarLida(req.params.id, req.userId); res.json({ success: true }); }));

module.exports = router;
