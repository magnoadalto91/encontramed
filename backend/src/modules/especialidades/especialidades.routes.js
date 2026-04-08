'use strict';

const router = require('express').Router();
const svc = require('./especialidades.service');
const auth = require('../../middlewares/auth.middleware');
const admin = require('../../middlewares/admin.middleware');

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

router.get('/', wrap(async (req, res) => res.json(await svc.listAll())));
router.get('/:id', wrap(async (req, res) => res.json(await svc.getById(req.params.id))));
router.post('/', auth, admin, wrap(async (req, res) => res.status(201).json(await svc.create(req.body))));
router.put('/:id', auth, admin, wrap(async (req, res) => res.json(await svc.update(req.params.id, req.body))));
router.delete('/:id', auth, admin, wrap(async (req, res) => { await svc.remove(req.params.id); res.json({ success: true }); }));

module.exports = router;
