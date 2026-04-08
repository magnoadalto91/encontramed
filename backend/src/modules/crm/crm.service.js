'use strict';

/**
 * CRM Validation Service — EncontraMed
 *
 * Primary source: consultacrm.com.br (100 free queries/month, no reCAPTCHA)
 *   Env: CONSULTACRM_KEY (required for production)
 *
 * Fallback: CFM Portal REST API (free, requires reCAPTCHA token from frontend)
 *   Env: (none — uses public site key)
 *
 * Both sources return the same normalized CfmResult shape:
 *   { nome, crm, uf, situacao, especialidades: [{nome, rqe}], dadosBrutos }
 */

const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const logger = require('../../utils/logger');

const prisma = new PrismaClient();

// Cache TTL: re-validate after 30 days
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Map CFM situation strings → our CrmStatus enum
 */
function mapSituacao(raw = '') {
  const s = raw.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (s.includes('ATIVO') || s.includes('REGULAR')) return 'ATIVO';
  if (s.includes('SUSPENS')) return 'SUSPENSO';
  if (s.includes('CANCEL')) return 'CANCELADO';
  return 'INATIVO';
}

/**
 * Normalize any source response into a consistent shape.
 */
function normalize(raw) {
  return {
    nome: raw.nome || raw.name || raw.NOME || null,
    crm: String(raw.crm || raw.CRM || raw.num_crm || '').trim(),
    uf: (raw.uf || raw.UF || raw.estado || '').toUpperCase(),
    situacao: mapSituacao(raw.situacao || raw.SITUACAO || raw.status || raw.STATUS || ''),
    especialidades: parseEspecialidades(raw),
    dadosBrutos: raw,
  };
}

function parseEspecialidades(raw) {
  // consultacrm.com.br returns array of strings or objects
  const list = raw.especialidades || raw.ESPECIALIDADES || raw.especialidade || [];
  if (!Array.isArray(list)) return [];
  return list.map(e => {
    if (typeof e === 'string') return { nome: e.trim(), rqe: null };
    return {
      nome: (e.nome || e.descricao || e.DESCRICAO || e.name || '').trim(),
      rqe: e.rqe || e.RQE || e.numeroRQE || null,
    };
  }).filter(e => e.nome);
}

// ─── Source 1: consultacrm.com.br ─────────────────────────────────────────────

async function queryConsultaCrm(crm, uf) {
  const key = process.env.CONSULTACRM_KEY;
  if (!key) return null; // key not configured → skip

  const url = `https://www.consultacrm.com.br/api/index.php?tipo=medico&uf=${uf}&q=${crm}&chave=${key}&destino=json`;
  const { data } = await axios.get(url, { timeout: 10000 });

  // Response is { total, items: [...] } or { error }
  if (!data || data.erro || !data.items?.length) return null;

  const item = data.items[0];
  return normalize({
    ...item,
    especialidades: item.especialidades || [],
  });
}

// ─── Source 2: CFM Portal REST API (requires reCAPTCHA token) ─────────────────

async function queryCfmPortal(crm, uf, captchaToken) {
  if (!captchaToken) return null;

  const payload = {
    useCaptchav2: false,
    captcha: captchaToken,
    medico: { crmMedico: String(crm), ufMedico: uf.toUpperCase(), nome: '', municipioMedico: '', tipoInscricaoMedico: '', situacaoMedico: '', detalheSituacaoMedico: '', especialidadeMedico: '', areaAtuacaoMedico: '' },
    page: 1,
    pageNumber: 1,
    pageSize: 10,
  };

  const { data } = await axios.post(
    'https://portal.cfm.org.br/api_rest_php/api/v2/medicos/buscar_medicos',
    payload,
    { timeout: 15000, headers: { 'Content-Type': 'application/json', 'Origin': 'https://portal.cfm.org.br', 'Referer': 'https://portal.cfm.org.br/busca-medicos/' } }
  );

  const items = data?.data || data?.medicos || data?.resultado || [];
  if (!Array.isArray(items) || !items.length) return null;

  const m = items[0];
  return normalize({
    nome: m.nome || m.NOME,
    crm: m.nrcrm || m.crm || m.CRM || crm,
    uf: m.ufconselho || m.uf || uf,
    situacao: m.situacao || m.SITUACAO || m.situacaoDescricao || '',
    especialidades: (m.especialidades || []).map(e => ({
      nome: e.descricao || e.nome || e,
      rqe: e.rqe || e.numeroRQE || null,
    })),
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Validate a CRM number against CFM data.
 * Uses cache (crmDadosCfm) to avoid repeated API calls.
 *
 * @param {string} crm
 * @param {string} uf
 * @param {string|null} captchaToken — reCAPTCHA v3 token (required for CFM Portal fallback)
 * @param {boolean} forceRefresh — ignore cache and re-fetch
 */
async function validarCrm(crm, uf, captchaToken = null, forceRefresh = false) {
  if (!crm || !uf) throw Object.assign(new Error('CRM e UF são obrigatórios'), { status: 400 });

  crm = String(crm).replace(/\D/g, '');
  uf = uf.toUpperCase().trim();

  // Check cache
  if (!forceRefresh) {
    const medico = await prisma.medicos.findFirst({ where: { crm, crmUf: uf } });
    if (medico?.crmDadosCfm && medico.crmUltimaVerif) {
      const age = Date.now() - new Date(medico.crmUltimaVerif).getTime();
      if (age < CACHE_TTL_MS) {
        logger.info(`[crm] Cache hit para CRM ${crm}/${uf}`);
        return medico.crmDadosCfm;
      }
    }
  }

  // Try sources in order
  let resultado = null;

  try {
    resultado = await queryConsultaCrm(crm, uf);
    if (resultado) logger.info(`[crm] consultacrm.com.br: CRM ${crm}/${uf} → ${resultado.situacao}`);
  } catch (err) {
    logger.warn(`[crm] consultacrm.com.br falhou: ${err.message}`);
  }

  if (!resultado && captchaToken) {
    try {
      resultado = await queryCfmPortal(crm, uf, captchaToken);
      if (resultado) logger.info(`[crm] CFM Portal: CRM ${crm}/${uf} → ${resultado.situacao}`);
    } catch (err) {
      logger.warn(`[crm] CFM Portal falhou: ${err.message}`);
    }
  }

  if (!resultado) {
    const err = Object.assign(
      new Error('Não foi possível validar o CRM no momento. Tente novamente mais tarde.'),
      { status: 503, serviceUnavailable: true }
    );
    throw err;
  }

  return resultado;
}

/**
 * Validate CRM and persist the result into the medicos table.
 * Also syncs especialidades and RQEs into the database.
 */
async function validarEPersistir(medicoId, crm, uf, captchaToken = null, forceRefresh = false) {
  const resultado = await validarCrm(crm, uf, captchaToken, forceRefresh);

  const crmStatus = resultado.situacao; // already a valid CrmStatus enum value

  // Persist CRM data
  await prisma.medicos.update({
    where: { id: medicoId },
    data: {
      crm,
      crmUf: uf,
      crmStatus,
      crmUltimaVerif: new Date(),
      crmDadosCfm: resultado,
    },
  });

  // Sync especialidades
  if (resultado.especialidades?.length) {
    await syncEspecialidades(medicoId, resultado.especialidades);
  }

  logger.info(`[crm] Médico ${medicoId}: CRM ${crm}/${uf} validado → ${crmStatus}`);
  return resultado;
}

/**
 * Sync CFM especialidades into our DB.
 * Creates missing especialidades, links to médico, stores RQE.
 */
async function syncEspecialidades(medicoId, especialidades) {
  for (const esp of especialidades) {
    if (!esp.nome) continue;

    // Upsert especialidade
    const codigo = esp.nome.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z_]/g, '').slice(0, 50);
    const especialidade = await prisma.especialidades.upsert({
      where: { nome: esp.nome },
      update: {},
      create: { nome: esp.nome, codigo },
    });

    // Link médico ↔ especialidade
    await prisma.medico_especialidades.upsert({
      where: { medicoId_especialidadeId: { medicoId, especialidadeId: especialidade.id } },
      update: { rqeNumero: esp.rqe || null, rqeValidado: !!esp.rqe },
      create: {
        medicoId,
        especialidadeId: especialidade.id,
        rqeNumero: esp.rqe || null,
        rqeValidado: !!esp.rqe,
        principal: false,
      },
    });
  }
}

module.exports = { validarCrm, validarEPersistir, syncEspecialidades };
