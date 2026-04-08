'use strict';

/**
 * CNES Service — EncontraMed
 *
 * Combina duas fontes para máximo de dados:
 *   1. BrasilAPI /cnpj — razão social, endereço e contato da Receita Federal
 *   2. DATASUS CNES API — código CNES, tipo, leitos, equipamentos
 *
 * Retorna estrutura normalizada pronta para preencher o perfil do hospital.
 */

const axios = require('axios');
const logger = require('../../utils/logger');

const CNES_API   = 'https://apidadosabertos.saude.gov.br/cnes';
const BRASIL_API = 'https://brasilapi.com.br/api';

// ─── Fontes ───────────────────────────────────────────────────────────────────

async function queryBrasilApiCnpj(cnpj) {
  const { data } = await axios.get(`${BRASIL_API}/cnpj/v1/${cnpj}`, {
    timeout: 10000,
    headers: { Accept: 'application/json' },
  });
  return data;
}

async function queryCnesEstabelecimento(cnpj) {
  const { data } = await axios.get(`${CNES_API}/estabelecimentos`, {
    params: { cnpj, limit: 1 },
    timeout: 10000,
    headers: { Accept: 'application/json' },
  });
  // API retorna { dados: [...] } ou array direto
  const list = data?.dados || data?.data || data?.items || (Array.isArray(data) ? data : []);
  return list[0] || null;
}

async function queryCnesDetalhe(coCnes) {
  const { data } = await axios.get(`${CNES_API}/estabelecimentos/${coCnes}`, {
    timeout: 10000,
    headers: { Accept: 'application/json' },
  });
  return data;
}

async function queryCnesLeitos(coCnes) {
  const { data } = await axios.get(`${CNES_API}/estabelecimentos-leitos/${coCnes}`, {
    params: { limit: 200 },
    timeout: 10000,
    headers: { Accept: 'application/json' },
  });
  const list = data?.dados || data?.data || data?.items || (Array.isArray(data) ? data : []);
  return list;
}

async function queryCnesEquipamentos(coCnes) {
  const { data } = await axios.get(`${CNES_API}/estabelecimentos-equipamentos/${coCnes}`, {
    params: { limit: 200 },
    timeout: 10000,
    headers: { Accept: 'application/json' },
  });
  const list = data?.dados || data?.data || data?.items || (Array.isArray(data) ? data : []);
  return list;
}

// ─── Normalização ─────────────────────────────────────────────────────────────

function normalizarEstabelecimento(brasilApi, cnes) {
  const b = brasilApi || {};
  const c = cnes || {};

  // Preferência: Receita Federal (mais confiável para razão social/endereço) + CNES para dados de saúde
  return {
    razaoSocial:         b.razao_social         || c.no_razao_social  || '',
    nomeFantasia:        b.nome_fantasia         || c.no_fantasia      || '',
    cnpj:                b.cnpj                 || c.nu_cnpj          || '',
    codigoCNES:          String(c.co_cnes        || '').trim(),
    tipoEstabelecimento: c.ds_tipo_unidade       || c.tp_unidade       || '',
    enderecoLogradouro:  c.no_logradouro         || b.logradouro       || '',
    enderecoNumero:      c.nu_endereco           || b.numero           || '',
    enderecoBairro:      c.no_bairro             || b.bairro           || '',
    enderecoCidade:      c.no_municipio          || b.municipio        || '',
    enderecoEstado:      c.sg_uf                 || b.uf               || '',
    enderecoCep:        (c.co_cep               || b.cep              || '').replace(/\D/g, ''),
    telefoneContato:     c.nu_telefone           || b.ddd_telefone_1   || '',
    latitude:            c.nu_latitude  ? parseFloat(c.nu_latitude)  : null,
    longitude:           c.nu_longitude ? parseFloat(c.nu_longitude) : null,
    naturezaJuridica:    b.natureza_juridica?.descricao || '',
    atividadePrincipal:  b.atividade_principal?.[0]?.text || '',
  };
}

function normalizarLeitos(lista) {
  if (!Array.isArray(lista) || !lista.length) return null;

  let totalExistentes = 0, totalSus = 0, totalNaoSus = 0;
  const detalhes = [];

  for (const item of lista) {
    const desc     = item.ds_leito         || item.tp_leito    || item.descricao  || '';
    const exist    = Number(item.qt_exist  || item.qtd_exist   || 0);
    const sus      = Number(item.qt_sus    || item.qtd_sus     || 0);
    const naoSus   = Number(item.qt_nsus   || item.qtd_nao_sus || 0);

    if (!desc || exist === 0) continue;
    totalExistentes += exist;
    totalSus        += sus;
    totalNaoSus     += naoSus;
    detalhes.push({ tipo: desc, existentes: exist, sus, naoSus });
  }

  return {
    total:   totalExistentes,
    sus:     totalSus,
    naoSus:  totalNaoSus,
    detalhes: detalhes.sort((a, b) => b.existentes - a.existentes),
  };
}

function normalizarEquipamentos(lista) {
  if (!Array.isArray(lista) || !lista.length) return [];

  return lista
    .map(item => ({
      nome:       item.ds_equipamento || item.descricao        || item.no_equipamento || '',
      quantidade: Number(item.qt_exist  || item.qtd_existente  || 0),
      emUso:      Number(item.qt_em_uso || item.qtd_em_uso     || 0),
    }))
    .filter(e => e.nome && e.quantidade > 0)
    .sort((a, b) => b.quantidade - a.quantidade);
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Consulta todos os dados do hospital pelo CNPJ.
 * Retorna estrutura normalizada + dados brutos.
 */
async function buscarPorCNPJ(cnpj) {
  const cnpjLimpo = cnpj.replace(/\D/g, '');

  let brasilApiData = null;
  let cnesBasico    = null;
  let cnesDetalhe   = null;
  let leitos        = null;
  let equipamentos  = [];

  // 1. BrasilAPI — dados da Receita Federal
  try {
    brasilApiData = await queryBrasilApiCnpj(cnpjLimpo);
    logger.info(`[cnes] BrasilAPI OK para CNPJ ${cnpjLimpo}: ${brasilApiData.razao_social}`);
  } catch (err) {
    logger.warn(`[cnes] BrasilAPI falhou para ${cnpjLimpo}: ${err.message}`);
  }

  // 2. CNES — dados do estabelecimento de saúde
  try {
    cnesBasico = await queryCnesEstabelecimento(cnpjLimpo);
    if (cnesBasico) {
      logger.info(`[cnes] CNES encontrado: co_cnes=${cnesBasico.co_cnes}`);
    } else {
      logger.info(`[cnes] CNPJ ${cnpjLimpo} não encontrado no CNES (pode não ser estabelecimento de saúde registrado)`);
    }
  } catch (err) {
    logger.warn(`[cnes] CNES/estabelecimentos falhou: ${err.message}`);
  }

  // 3. Detalhes CNES + leitos + equipamentos (só se tiver código CNES)
  if (cnesBasico?.co_cnes) {
    const coCnes = cnesBasico.co_cnes;

    try {
      cnesDetalhe = await queryCnesDetalhe(coCnes);
    } catch (err) {
      logger.warn(`[cnes] CNES/detalhe ${coCnes} falhou: ${err.message}`);
    }

    try {
      const leitosRaw = await queryCnesLeitos(coCnes);
      leitos = normalizarLeitos(leitosRaw);
    } catch (err) {
      logger.warn(`[cnes] CNES/leitos ${coCnes} falhou: ${err.message}`);
    }

    try {
      const equipRaw = await queryCnesEquipamentos(coCnes);
      equipamentos = normalizarEquipamentos(equipRaw);
    } catch (err) {
      logger.warn(`[cnes] CNES/equipamentos ${coCnes} falhou: ${err.message}`);
    }
  }

  // Sem dados mínimos → retorna null
  if (!brasilApiData && !cnesBasico) return null;

  const estabelecimento = normalizarEstabelecimento(brasilApiData, cnesDetalhe || cnesBasico);

  return {
    ...estabelecimento,
    leitos,
    equipamentos,
    dadosBrutos: {
      brasilApi: brasilApiData,
      cnes: cnesDetalhe || cnesBasico,
    },
  };
}

/**
 * Busca por código CNES diretamente.
 */
async function buscarPorCodigo(codigoCNES) {
  try {
    const data = await queryCnesDetalhe(codigoCNES);
    return normalizarEstabelecimento(null, data);
  } catch (err) {
    logger.warn(`[cnes] Falha ao buscar CNES ${codigoCNES}: ${err.message}`);
    return null;
  }
}

module.exports = { buscarPorCNPJ, buscarPorCodigo };
