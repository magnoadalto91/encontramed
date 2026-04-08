'use strict';

const authService = require('./auth.service');

async function login(req, res, next) {
  try {
    const { email, senha, plataforma } = req.body;
    if (!email || !senha) return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });

    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];
    const result = await authService.login(email, senha, plataforma || 'web', ipAddress, userAgent);
    res.json(result);
  } catch (err) { next(err); }
}

async function logout(req, res, next) {
  try {
    await authService.logout(req.userId, req.sid);
    res.json({ success: true });
  } catch (err) { next(err); }
}

async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
}

async function verificarEmail(req, res, next) {
  try {
    const result = await authService.verificarEmail(req.params.token);
    res.json(result);
  } catch (err) { next(err); }
}

async function reenviarVerificacao(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'E-mail é obrigatório' });
    const result = await authService.reenviarVerificacao(email);
    res.json(result);
  } catch (err) { next(err); }
}

async function recuperarSenha(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'E-mail é obrigatório' });
    const result = await authService.recuperarSenha(email);
    res.json(result);
  } catch (err) { next(err); }
}

async function redefinirSenha(req, res, next) {
  try {
    const { token, novaSenha } = req.body;
    if (!token || !novaSenha) return res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
    if (novaSenha.length < 8) return res.status(400).json({ error: 'Senha deve ter no mínimo 8 caracteres' });
    const result = await authService.redefinirSenha(token, novaSenha);
    res.json(result);
  } catch (err) { next(err); }
}

async function me(req, res, next) {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const user = await prisma.usuarios.findUnique({
      where: { id: req.userId },
      select: {
        id: true, email: true, nomeCompleto: true, role: true,
        telefone: true, ativo: true, onboardingDone: true, criadoEm: true,
        medico: { select: { id: true, crm: true, crmUf: true, crmStatus: true, fotoPerfil: true } },
        hospital: { select: { id: true, cnpj: true, razaoSocial: true, nomeFantasia: true, logoUrl: true, verificado: true } },
      },
    });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(user);
  } catch (err) { next(err); }
}

module.exports = { login, logout, register, verificarEmail, reenviarVerificacao, recuperarSenha, redefinirSenha, me };
