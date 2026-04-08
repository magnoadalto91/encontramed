'use strict';

const express = require('express');
const router  = express.Router();
const svc     = require('./chat.service');
const authMiddleware  = require('../../middlewares/auth.middleware');

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

// GET /api/chat/plantao/:plantaoId — listar mensagens
router.get('/plantao/:plantaoId', authMiddleware, wrap(async (req, res) => {
  const msgs = await svc.getMensagens(req.params.plantaoId, req.userId, req.role);
  res.json(msgs);
}));

// POST /api/chat/plantao/:plantaoId — enviar mensagem
router.post('/plantao/:plantaoId', authMiddleware, wrap(async (req, res) => {
  const msg = await svc.enviarMensagem(req.params.plantaoId, req.userId, req.role, req.body.texto);
  res.status(201).json(msg);
}));

module.exports = router;
