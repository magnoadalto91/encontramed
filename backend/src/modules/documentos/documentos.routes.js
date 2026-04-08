'use strict';

const router = require('express').Router();
const svc = require('./documentos.service');
const auth = require('../../middlewares/auth.middleware');
const suporteMw = require('../../middlewares/suporte.middleware');
const { uploadDocumento } = require('../../middlewares/upload.middleware');
const { uploadLimiter } = require('../../config/rateLimiter');
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

// Literal routes BEFORE /:id
router.get('/meus', auth, wrap(async (req, res) => res.json(await svc.getMeus(req.userId))));
router.get('/pendentes', auth, suporteMw, wrap(async (req, res) => {
  res.json(await svc.listarPendentes(req.query.page, req.query.limit));
}));
router.post('/upload', auth, uploadLimiter, uploadDocumento.single('arquivo'), wrap(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' });
  const { tipo } = req.body;
  if (!tipo) return res.status(400).json({ error: 'Tipo do documento é obrigatório' });
  res.status(201).json(await svc.upload(req.userId, req.file, tipo));
}));

// Dynamic /:id
router.get('/:id/url', auth, wrap(async (req, res) => res.json(await svc.getPresignedDocUrl(req.params.id, req.userId))));
router.post('/:id/validar', auth, suporteMw, wrap(async (req, res) => res.json(await svc.validar(req.params.id, req.userId))));
router.post('/:id/rejeitar', auth, suporteMw, wrap(async (req, res) => res.json(await svc.rejeitar(req.params.id, req.userId, req.body.motivoRejeicao))));

module.exports = router;
