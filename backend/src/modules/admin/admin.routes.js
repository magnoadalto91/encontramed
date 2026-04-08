'use strict';

const router = require('express').Router();
const svc = require('./admin.service');
const auth = require('../../middlewares/auth.middleware');
const adminMw = require('../../middlewares/admin.middleware');
const suporteMw = require('../../middlewares/suporte.middleware');
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

// Dashboard
router.get('/stats', auth, adminMw, wrap(async (req, res) => res.json(await svc.getStats())));

// Usuários
router.get('/usuarios', auth, adminMw, wrap(async (req, res) => res.json(await svc.listarUsuarios(req.query))));
router.put('/usuarios/:id/ativar', auth, adminMw, wrap(async (req, res) => res.json(await svc.ativarUsuario(req.params.id))));
router.put('/usuarios/:id/suspender', auth, adminMw, wrap(async (req, res) => res.json(await svc.suspenderUsuario(req.params.id))));

// Médicos
router.post('/medicos/:id/revalidar-crm', auth, adminMw, wrap(async (req, res) => res.json(await svc.revalidarCRM(req.params.id))));

// Hospitais
router.post('/hospitais/:id/verificar', auth, adminMw, wrap(async (req, res) => res.json(await svc.verificarHospital(req.params.id))));

// Chamados (ADMIN + SUPORTE)
router.get('/chamados', auth, suporteMw, wrap(async (req, res) => res.json(await svc.listarChamados(req.query))));
router.get('/chamados/:id', auth, suporteMw, wrap(async (req, res) => {
  const chamado = await svc.getChamado(req.params.id);
  if (!chamado) return res.status(404).json({ error: 'Chamado não encontrado' });
  res.json(chamado);
}));
router.post('/chamados/:id/mensagem', auth, suporteMw, wrap(async (req, res) => {
  const { texto, resolver } = req.body;
  res.json(await svc.responderChamado(req.params.id, req.userId, texto, resolver));
}));

// Documentos (ADMIN + SUPORTE — duplicado dos /documentos para painel admin)
const docSvc = require('../documentos/documentos.service');
router.get('/documentos/fila', auth, suporteMw, wrap(async (req, res) => res.json(await docSvc.listarPendentes(req.query.page, req.query.limit))));
router.post('/documentos/:id/validar', auth, suporteMw, wrap(async (req, res) => res.json(await docSvc.validar(req.params.id, req.userId))));
router.post('/documentos/:id/rejeitar', auth, suporteMw, wrap(async (req, res) => res.json(await docSvc.rejeitar(req.params.id, req.userId, req.body.motivoRejeicao))));

// Financeiro
const finSvc = require('../financeiro/financeiro.service');
router.post('/financeiro/pagamento/:id/confirmar', auth, adminMw, wrap(async (req, res) => res.json(await finSvc.confirmarPagamento(req.params.id, req.userId))));

// Config
router.get('/config', auth, adminMw, wrap(async (req, res) => res.json(await svc.getConfig())));
router.put('/config', auth, adminMw, wrap(async (req, res) => {
  const { chave, valor, descricao } = req.body;
  res.json(await svc.setConfig(chave, valor, descricao));
}));

module.exports = router;
