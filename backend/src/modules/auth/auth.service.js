'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { Resend } = require('resend');
const { generateToken } = require('../../utils/crypto');
const { escapeHtml } = require('../../utils/escapeHtml');
const { sendToUser } = require('../../config/websocket');
const logger = require('../../utils/logger');

const prisma = new PrismaClient();
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@encontramed.com.br';

// Lazy — só instancia quando for realmente enviar e-mail
function getResend() {
  if (!process.env.RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY não configurada — e-mails não serão enviados');
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
}

// Session limits per role — also serves as an upsell mechanism (FREE → PRO)
const SESSOES_MAX_POR_ROLE = {
  MEDICO: 2,   // smartphone + web tablet
  HOSPITAL: 3, // multiple staff members, one at a time
  ADMIN: 10,
  SUPORTE: 3,
};

/**
 * Create a new session, enforcing per-role session limits.
 * Oldest sessions are invalidated when the limit is exceeded.
 * Returns a signed JWT containing { userId, role, sid }.
 */
async function _criarSessao(user, plataforma, ipAddress, userAgent) {
  const limite = SESSOES_MAX_POR_ROLE[user.role] || 1;

  const ativas = await prisma.sessoes.findMany({
    where: { userId: user.id, ativo: true },
    orderBy: { inicio: 'asc' },
  });

  // Invalidate oldest sessions to stay within limit
  if (ativas.length >= limite) {
    const paraEncerrar = ativas.slice(0, ativas.length - limite + 1);
    for (const s of paraEncerrar) {
      await prisma.sessoes.update({
        where: { id: s.id },
        data: { ativo: false, fim: new Date() },
      });
      // Notify the displaced session via WebSocket
      try {
        sendToUser(user.id, { type: 'sessao_encerrada', message: 'Sua sessão foi encerrada em outro dispositivo.' });
      } catch {
        // WebSocket may not be initialized yet during startup
      }
    }
  }

  const sessao = await prisma.sessoes.create({
    data: {
      userId: user.id,
      plataforma: plataforma || 'web',
      ativo: true,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    },
  });

  const token = jwt.sign(
    { userId: user.id, role: user.role, sid: sessao.sessionId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return token;
}

/**
 * Authenticate a user with email and password.
 * Blocks SUPORTE accounts from logging in through the main platform route.
 */
async function login(email, senha, plataforma, ipAddress, userAgent) {
  const user = await prisma.usuarios.findUnique({ where: { email: email.toLowerCase().trim() } });

  if (!user) {
    throw Object.assign(new Error('Credenciais inválidas'), { status: 401 });
  }

  const senhaOk = await bcrypt.compare(senha, user.senhaHash);
  if (!senhaOk) {
    throw Object.assign(new Error('Credenciais inválidas'), { status: 401 });
  }

  if (!user.emailVerificado) {
    throw Object.assign(new Error('E-mail não verificado. Verifique sua caixa de entrada.'), { status: 403 });
  }

  if (!user.ativo) {
    throw Object.assign(new Error('Conta suspensa. Entre em contato com o suporte.'), { status: 403 });
  }

  // Recovery: ensure role-specific profile exists (for accounts created before auto-creation)
  if (user.role === 'MEDICO') {
    const medico = await prisma.medicos.findFirst({ where: { usuarioId: user.id } });
    if (!medico) {
      await prisma.medicos.create({ data: { usuarioId: user.id } });
      logger.warn(`[recovery] Perfil médico criado para usuário ${user.id}`);
    }
  } else if (user.role === 'HOSPITAL') {
    const hospital = await prisma.hospitais.findFirst({ where: { usuarioId: user.id } });
    if (!hospital) {
      await prisma.hospitais.create({
        data: { usuarioId: user.id, cnpj: '00000000000000', razaoSocial: user.nomeCompleto },
      });
      logger.warn(`[recovery] Perfil hospital criado para usuário ${user.id}`);
    }
  }

  const token = await _criarSessao(user, plataforma, ipAddress, userAgent);

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      nomeCompleto: user.nomeCompleto,
      role: user.role,
      onboardingDone: user.onboardingDone,
    },
  };
}

/**
 * Invalidate a session by sessionId (sid).
 * Called on logout — always invalidate in DB, not just on client.
 */
async function logout(userId, sid) {
  await prisma.sessoes.updateMany({
    where: { userId, sessionId: sid, ativo: true },
    data: { ativo: false, fim: new Date() },
  });
}

/**
 * Register a new user.
 * Hashes password with bcrypt(10), creates user record,
 * generates verification token and sends verification email.
 * MEDICO: CRM validation against CFM is mandatory before account creation.
 */
async function register(data) {
  const { email, senha, nomeCompleto, role, telefone } = data;

  // Validate allowed roles for self-registration
  if (!['MEDICO', 'HOSPITAL'].includes(role)) {
    throw Object.assign(new Error('Tipo de conta inválido'), { status: 400 });
  }

  // ── CRM validation (mandatory for MEDICO) ────────────────────────────────
  if (role === 'MEDICO') {
    const crm = String(data.crm || '').replace(/\D/g, '');
    const crmUf = String(data.crmUf || '').toUpperCase().trim();

    if (!crm || !crmUf) {
      throw Object.assign(new Error('CRM e UF são obrigatórios para cadastro de médico'), { status: 400 });
    }

    const { validarCrm } = require('../crm/crm.service');
    let dadosCfm = null;
    let crmStatusInicial = 'NAO_VERIFICADO';

    try {
      dadosCfm = await validarCrm(crm, crmUf, data.captchaToken || null);
    } catch (err) {
      if (err.serviceUnavailable) {
        // Serviço de validação indisponível — permite cadastro, admin verifica manualmente
        logger.warn(`[register] Serviço CFM indisponível para CRM ${crm}/${crmUf} — cadastro com NAO_VERIFICADO`);
      } else {
        throw err; // erro inesperado — propaga
      }
    }

    if (dadosCfm) {
      if (dadosCfm.situacao !== 'ATIVO') {
        throw Object.assign(
          new Error(`CRM ${crm}/${crmUf} está com situação "${dadosCfm.situacao}" no CFM. Apenas médicos com CRM ativo podem se cadastrar.`),
          { status: 422 }
        );
      }
      crmStatusInicial = 'ATIVO';
    }

    // Store validated CFM data to persist after user creation
    data._dadosCfm = dadosCfm;
    data._crm = crm;
    data._crmUf = crmUf;
    data._crmStatus = crmStatusInicial;
  }
  // ─────────────────────────────────────────────────────────────────────────

  const existing = await prisma.usuarios.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (existing) {
    throw Object.assign(new Error('E-mail já cadastrado'), { status: 409 });
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  const tokenVerificacao = generateToken();

  // Auto-verify when RESEND is not configured (dev/staging without email setup)
  const autoVerificar = !process.env.RESEND_API_KEY;

  const user = await prisma.usuarios.create({
    data: {
      email: email.toLowerCase().trim(),
      senhaHash,
      nomeCompleto,
      role,
      telefone: telefone || null,
      emailVerificado: autoVerificar,
      tokenVerificacao: autoVerificar ? null : tokenVerificacao,
    },
  });

  // Create the role-specific profile record
  if (role === 'MEDICO') {
    const medicoRecord = await prisma.medicos.create({
      data: {
        usuarioId: user.id,
        crm: data._crm,
        crmUf: data._crmUf,
        crmStatus: data._crmStatus || 'NAO_VERIFICADO',
        crmUltimaVerif: data._dadosCfm ? new Date() : null,
        crmDadosCfm: data._dadosCfm || undefined,
      },
    });

    // Sync especialidades from CFM data
    if (data._dadosCfm?.especialidades?.length) {
      const { validarEPersistir } = require('../crm/crm.service');
      // Re-use syncEspecialidades indirectly — call internal from crm service
      const crmSvc = require('../crm/crm.service');
      if (crmSvc.syncEspecialidades) {
        await crmSvc.syncEspecialidades(medicoRecord.id, data._dadosCfm.especialidades);
      }
    }
  } else if (role === 'HOSPITAL') {
    // Hospital requires CNPJ — will be completed during onboarding
    await prisma.hospitais.create({
      data: {
        usuarioId: user.id,
        cnpj: data.cnpj || '00000000000000',
        razaoSocial: nomeCompleto,
      },
    });
  }

  // Send verification email only when Resend is configured
  if (!autoVerificar) {
    await _enviarEmailVerificacao(user, tokenVerificacao);
  }

  const message = autoVerificar
    ? 'Cadastro realizado! Faça login para continuar.'
    : 'Cadastro realizado. Verifique seu e-mail para ativar a conta.';

  return { message };
}

/**
 * Mark email as verified by token.
 */
async function verificarEmail(token) {
  const user = await prisma.usuarios.findUnique({
    where: { tokenVerificacao: token },
  });

  if (!user) {
    throw Object.assign(new Error('Token de verificação inválido ou expirado'), { status: 400 });
  }

  await prisma.usuarios.update({
    where: { id: user.id },
    data: { emailVerificado: true, tokenVerificacao: null },
  });

  return { message: 'E-mail verificado com sucesso. Você já pode fazer login.' };
}

/**
 * Initiate password recovery — generate token valid for 15 minutes.
 * Always returns the same message to prevent user enumeration.
 */
async function recuperarSenha(email) {
  const user = await prisma.usuarios.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  // Silently succeed — never reveal if email exists
  if (!user) {
    return { message: 'Se este e-mail estiver cadastrado, você receberá as instruções de recuperação.' };
  }

  const tokenRecuperacao = generateToken();
  const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await prisma.usuarios.update({
    where: { id: user.id },
    data: { tokenRecuperacao, tokenRecuperacaoExpiry: expiry },
  });

  await _enviarEmailRecuperacao(user, tokenRecuperacao);

  return { message: 'Se este e-mail estiver cadastrado, você receberá as instruções de recuperação.' };
}

/**
 * Reset password using recovery token.
 * Token expires in 15 minutes. On success, invalidates ALL active sessions.
 */
async function redefinirSenha(token, novaSenha) {
  const user = await prisma.usuarios.findUnique({
    where: { tokenRecuperacao: token },
  });

  if (!user || !user.tokenRecuperacaoExpiry) {
    throw Object.assign(new Error('Token de recuperação inválido ou expirado'), { status: 400 });
  }

  if (new Date() > user.tokenRecuperacaoExpiry) {
    throw Object.assign(new Error('Token de recuperação expirado. Solicite um novo.'), { status: 400 });
  }

  const senhaHash = await bcrypt.hash(novaSenha, 10);

  await prisma.usuarios.update({
    where: { id: user.id },
    data: {
      senhaHash,
      tokenRecuperacao: null,
      tokenRecuperacaoExpiry: null,
    },
  });

  // Invalidate all active sessions — security measure after password change
  await prisma.sessoes.updateMany({
    where: { userId: user.id, ativo: true },
    data: { ativo: false, fim: new Date() },
  });

  // Notify user via WebSocket if connected
  try {
    sendToUser(user.id, { type: 'sessao_encerrada', message: 'Senha alterada. Faça login novamente.' });
  } catch {
    // WebSocket may not be available
  }

  return { message: 'Senha redefinida com sucesso. Faça login com a nova senha.' };
}

/**
 * Resend verification email to an unverified user.
 */
async function reenviarVerificacao(email) {
  const user = await prisma.usuarios.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user || user.emailVerificado) {
    return { message: 'Se este e-mail estiver pendente de verificação, você receberá um novo link.' };
  }

  const tokenVerificacao = generateToken();
  await prisma.usuarios.update({
    where: { id: user.id },
    data: { tokenVerificacao },
  });

  await _enviarEmailVerificacao(user, tokenVerificacao);

  return { message: 'Se este e-mail estiver pendente de verificação, você receberá um novo link.' };
}

// ─── Email helpers ─────────────────────────────────────────────────────────────

async function _enviarEmailVerificacao(user, token) {
  const frontendUrl = (process.env.FRONTEND_URL || '').split(',')[0].trim();
  const link = `${frontendUrl}/verificar-email?token=${token}`;
  const nome = escapeHtml(user.nomeCompleto);

  const resend = getResend();
  if (!resend) return;

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: user.email,
      subject: 'EncontraMed — Verifique seu e-mail',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A1628; color: #ffffff; padding: 40px; border-radius: 12px;">
          <h1 style="color: #26D0CE; margin-bottom: 8px;">EncontraMed</h1>
          <h2 style="color: #ffffff; font-weight: 400;">Bem-vindo(a), ${nome}!</h2>
          <p style="color: #cccccc; line-height: 1.6;">Para ativar sua conta, clique no botão abaixo:</p>
          <a href="${escapeHtml(link)}"
             style="display: inline-block; background: #26D0CE; color: #0A1628; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0;">
            Verificar E-mail
          </a>
          <p style="color: #888888; font-size: 13px; margin-top: 24px;">
            Este link é válido por 24 horas. Se você não criou uma conta, ignore este e-mail.
          </p>
          <p style="color: #555555; font-size: 12px;">
            Ou copie este link: <a href="${escapeHtml(link)}" style="color: #26D0CE;">${escapeHtml(link)}</a>
          </p>
        </div>
      `,
    });
  } catch (err) {
    logger.error('Falha ao enviar e-mail de verificação:', err.message);
    // Don't throw — allow registration to succeed even if email fails
  }
}

async function _enviarEmailRecuperacao(user, token) {
  const frontendUrl = (process.env.FRONTEND_URL || '').split(',')[0].trim();
  const link = `${frontendUrl}/redefinir-senha?token=${token}`;
  const nome = escapeHtml(user.nomeCompleto);

  const resend = getResend();
  if (!resend) return;

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: user.email,
      subject: 'EncontraMed — Redefinição de senha',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A1628; color: #ffffff; padding: 40px; border-radius: 12px;">
          <h1 style="color: #26D0CE; margin-bottom: 8px;">EncontraMed</h1>
          <h2 style="color: #ffffff; font-weight: 400;">Olá, ${nome}</h2>
          <p style="color: #cccccc; line-height: 1.6;">
            Recebemos uma solicitação de redefinição de senha para sua conta. Clique no botão abaixo:
          </p>
          <a href="${escapeHtml(link)}"
             style="display: inline-block; background: #26D0CE; color: #0A1628; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0;">
            Redefinir Senha
          </a>
          <p style="color: #ff6b6b; font-size: 14px; margin-top: 16px;">
            ⚠️ Este link expira em <strong>15 minutos</strong>.
          </p>
          <p style="color: #888888; font-size: 13px; margin-top: 16px;">
            Se você não solicitou a redefinição de senha, ignore este e-mail. Sua senha permanece a mesma.
          </p>
        </div>
      `,
    });
  } catch (err) {
    logger.error('Falha ao enviar e-mail de recuperação:', err.message);
  }
}

module.exports = {
  login,
  logout,
  register,
  verificarEmail,
  recuperarSenha,
  redefinirSenha,
  reenviarVerificacao,
};
