'use strict';

const router = require('express').Router();
const ctrl = require('./auth.controller');
const auth = require('../../middlewares/auth.middleware');
const { loginLimiter, registerLimiter, emailLimiter } = require('../../config/rateLimiter');

// Literal routes before dynamic
router.post('/login', loginLimiter, ctrl.login);
router.post('/register', registerLimiter, ctrl.register);
router.post('/logout', auth, ctrl.logout);
router.get('/me', auth, ctrl.me);
router.get('/verificar-email/:token', emailLimiter, ctrl.verificarEmail);
router.post('/reenviar-verificacao', emailLimiter, ctrl.reenviarVerificacao);
router.post('/recuperar-senha', emailLimiter, ctrl.recuperarSenha);
router.post('/redefinir-senha', ctrl.redefinirSenha);

module.exports = router;
