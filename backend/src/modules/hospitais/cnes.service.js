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
    params: { cnpj, limit: 5 },
    timeout: 15000,
    headers: { Accept: 'application/json' },
  });
  // A API pode retornar { dados:[...] }, { itens:[...] }, { items:[...] } ou array direto
  const list = data?.dados || data?.itens || data?.data || data?.items ||
               data?.estabelecimentos || (Array.isArray(data) ? data : []);
  if (!list.length) return null;
  // Prefere o item cujo co_cnes não seja nulo/zero
  return list.find(i => i.co_cnes && String(i.co_cnes) !== '0') || list[0];
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
    params: { limit: 500 },
    timeout: 15000,
    headers: { Accept: 'application/json' },
  });
  const list = data?.dados || data?.itens || data?.data || data?.items || (Array.isArray(data) ? data : []);
  logger.info(`[cnes] Leitos raw para ${coCnes}: ${list.length} itens, keys=${list[0] ? Object.keys(list[0]).join(',') : 'vazio'}`);
  return list;
}

async function queryCnesEquipamentos(coCnes) {
  const { data } = await axios.get(`${CNES_API}/estabelecimentos-equipamentos/${coCnes}`, {
    params: { limit: 500 },
    timeout: 15000,
    headers: { Accept: 'application/json' },
  });
  const list = data?.dados || data?.itens || data?.data || data?.items || (Array.isArray(data) ? data : []);
  logger.info(`[cnes] Equipamentos raw para ${coCnes}: ${list.length} itens, keys=${list[0] ? Object.keys(list[0]).join(',') : 'vazio'}`);
  return list;
}

async function queryCnesServicos(coCnes) {
  try {
    const { data } = await axios.get(`${CNES_API}/estabelecimentos-servicos/${coCnes}`, {
      params: { limit: 200 },
      timeout: 10000,
      headers: { Accept: 'application/json' },
    });
    return data?.dados || data?.itens || data?.data || data?.items || (Array.isArray(data) ? data : []);
  } catch {
    return [];
  }
}

// ─── Normalização ─────────────────────────────────────────────────────────────

function _first(...vals) {
  for (const v of vals) {
    const s = v === null || v === undefined ? '' : String(v).trim();
    if (s && s !== '0') return s;
  }
  return '';
}

function normalizarEstabelecimento(brasilApi, cnes) {
  const b = brasilApi || {};
  const c = cnes || {};

  const codigoCNES = _first(c.co_cnes, c.codigo_cnes, c.cnes, c.nu_cnes);

  return {
    razaoSocial:          _first(b.razao_social,       c.no_razao_social,   c.razao_social),
    nomeFantasia:         _first(b.nome_fantasia,       c.no_fantasia,       c.nome_fantasia),
    cnpj:                 _first(b.cnpj,                c.nu_cnpj,           c.cnpj),
    codigoCNES,
    tipoEstabelecimento:  _first(c.ds_tipo_unidade,     c.tp_unidade,        c.tipo_unidade,  c.descricao_tipo),
    enderecoLogradouro:   _first(c.no_logradouro,       c.logradouro,        b.logradouro),
    enderecoNumero:       _first(c.nu_endereco,         c.numero,            b.numero),
    enderecoBairro:       _first(c.no_bairro,           c.bairro,            b.bairro),
    enderecoCidade:       _first(c.no_municipio,        c.municipio,         b.municipio),
    enderecoEstado:       _first(c.sg_uf,               c.uf,                b.uf),
    enderecoCep:         (_first(c.co_cep,              c.cep,               b.cep)).replace(/\D/g, ''),
    telefoneContato:      _first(c.nu_telefone,         c.telefone,          b.ddd_telefone_1, b.ddd_fax),
    latitude:             c.nu_latitude  != null ? parseFloat(c.nu_latitude)  : (c.latitude  != null ? parseFloat(c.latitude)  : null),
    longitude:            c.nu_longitude != null ? parseFloat(c.nu_longitude) : (c.longitude != null ? parseFloat(c.longitude) : null),
    naturezaJuridica:     b.natureza_juridica?.descricao || _first(c.ds_natureza_juridica, c.natureza_juridica),
    atividadePrincipal:   b.atividade_principal?.[0]?.text || '',
    tipoGestao:           _first(c.ds_tipo_gestao,      c.tipo_gestao,       c.gestao),
    turnoAtendimento:     _first(c.ds_turno_atendimento, c.turno_atendimento, c.turno),
    atendeUrgencia:       c.co_atendimento_urgencia != null ? !!Number(c.co_atendimento_urgencia) : null,
    atendeInternacao:     c.co_atendimento_internacao != null ? !!Number(c.co_atendimento_internacao) : null,
    atendeAmbulatório:    c.co_atendimento_ambulatorial != null ? !!Number(c.co_atendimento_ambulatorial) : null,
  };
}

function normalizarLeitos(lista) {
  if (!Array.isArray(lista) || !lista.length) return null;

  let totalExistentes = 0, totalSus = 0, totalNaoSus = 0, totalContratados = 0;
  const detalhes = [];

  for (const item of lista) {
    const desc = item.ds_leito     || item.tp_leito      || item.no_leito    ||
                 item.tipo_leito   || item.descricao      || item.tipo        || '';
    const exist    = Number(item.qt_exist       || item.qt_existente  || item.qtd_exist    || item.existente    || item.quantidade   || 0);
    const sus      = Number(item.qt_sus         || item.qtd_sus       || item.sus          || 0);
    const naoSus   = Number(item.qt_nsus        || item.qt_nao_sus    || item.qtd_nao_sus  || item.nao_sus      || 0);
    const contrat  = Number(item.qt_contratado  || item.qt_contract   || item.contratado   || 0);

    if (!desc || exist === 0) continue;
    totalExistentes += exist;
    totalSus        += sus;
    totalNaoSus     += naoSus;
    totalContratados += contrat;
    detalhes.push({ tipo: desc, existentes: exist, sus, naoSus, contratados: contrat });
  }

  if (totalExistentes === 0) return null;

  return {
    total:       totalExistentes,
    sus:         totalSus,
    naoSus:      totalNaoSus,
    contratados: totalContratados,
    detalhes:    detalhes.sort((a, b) => b.existentes - a.existentes),
  };
}

function normalizarEquipamentos(lista) {
  if (!Array.isArray(lista) || !lista.length) return [];

  return lista
    .map(item => ({
      nome:       item.ds_equipamento  || item.no_equipamento || item.descricao || item.nome || '',
      quantidade: Number(item.qt_exist  || item.qtd_existente  || item.existente  || item.quantidade || 0),
      emUso:      Number(item.qt_em_uso || item.qtd_em_uso     || item.em_uso     || 0),
    }))
    .filter(e => e.nome && e.quantidade > 0)
    .sort((a, b) => b.quantidade - a.quantidade);
}

function normalizarServicos(lista) {
  if (!Array.isArray(lista) || !lista.length) return [];
  return lista
    .map(item => ({
      servico:      item.ds_servico     || item.no_servico    || item.descricao || '',
      classificacao: item.ds_classificacao || item.classificacao || '',
    }))
    .filter(e => e.servico);
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
  let servicos      = [];

  // 1. BrasilAPI — dados da Receita Federal
  try {
    brasilApiData = await queryBrasilApiCnpj(cnpjLimpo);
    logger.info(`[cnes] BrasilAPI OK para CNPJ ${cnpjLimpo}: ${brasilApiData.razao_social}`);
  } catch (err) {
    logger.warn(`[cnes] BrasilAPI falhou para ${cnpjLimpo}: ${err.response?.status || err.message}`);
  }

  // 2. CNES — dados do estabelecimento de saúde
  try {
    cnesBasico = await queryCnesEstabelecimento(cnpjLimpo);
    if (cnesBasico) {
      logger.info(`[cnes] CNES encontrado: co_cnes=${cnesBasico.co_cnes}, keys=${Object.keys(cnesBasico).join(',')}`);
    } else {
      logger.info(`[cnes] CNPJ ${cnpjLimpo} não encontrado no CNES`);
    }
  } catch (err) {
    logger.warn(`[cnes] CNES/estabelecimentos falhou: ${err.response?.status || err.message}`);
  }

  // Determinar código CNES — pode ser co_cnes, codigo_cnes, etc.
  const coCnes = cnesBasico
    ? (cnesBasico.co_cnes || cnesBasico.codigo_cnes || cnesBasico.cnes || cnesBasico.nu_cnes || null)
    : null;

  // 3. Detalhes + leitos + equipamentos + serviços (só se tiver código CNES)
  if (coCnes) {
    const coCnesStr = String(coCnes).trim();

    const [detalhe, leitosRaw, equipRaw, servicosRaw] = await Promise.allSettled([
      queryCnesDetalhe(coCnesStr),
      queryCnesLeitos(coCnesStr),
      queryCnesEquipamentos(coCnesStr),
      queryCnesServicos(coCnesStr),
    ]);

    if (detalhe.status === 'fulfilled') {
      cnesDetalhe = detalhe.value;
      logger.info(`[cnes] Detalhe ${coCnesStr}: keys=${Object.keys(cnesDetalhe || {}).join(',')}`);
    } else {
      logger.warn(`[cnes] CNES/detalhe ${coCnesStr} falhou: ${detalhe.reason?.message}`);
    }

    if (leitosRaw.status === 'fulfilled') {
      leitos = normalizarLeitos(leitosRaw.value);
    } else {
      logger.warn(`[cnes] CNES/leitos ${coCnesStr} falhou: ${leitosRaw.reason?.message}`);
    }

    if (equipRaw.status === 'fulfilled') {
      equipamentos = normalizarEquipamentos(equipRaw.value);
    } else {
      logger.warn(`[cnes] CNES/equipamentos ${coCnesStr} falhou: ${equipRaw.reason?.message}`);
    }

    if (servicosRaw.status === 'fulfilled') {
      servicos = normalizarServicos(servicosRaw.value);
    }
  }

  // Sem dados mínimos → retorna null
  if (!brasilApiData && !cnesBasico) return null;

  const estabelecimento = normalizarEstabelecimento(brasilApiData, cnesDetalhe || cnesBasico);

  return {
    ...estabelecimento,
    leitos,
    equipamentos,
    servicos,
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

module.exports = { buscarPorCNPJ, buscarPorCodigo, normalizarEstabelecimento, normalizarLeitos, normalizarEquipamentos };
