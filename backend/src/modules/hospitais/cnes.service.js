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

// Decode de tipo_gestao (código de 1 letra → descrição)
const TIPO_GESTAO = {
  'M': 'Municipal', 'E': 'Estadual', 'F': 'Federal',
  'D': 'Dupla', 'S': 'Sem Gestão', 'P': 'Privada',
};

function _decodeTipoGestao(v) {
  if (!v) return '';
  return TIPO_GESTAO[String(v).toUpperCase().trim()] || String(v);
}

// Decode do campo codigo_tipo_unidade (código numérico → descrição legível)
// Fonte: tabela CNES/SIGTAP
const TIPO_UNIDADE = {
  '01':'Posto de Saúde','02':'Centro de Saúde / UBS','04':'Policlínica',
  '05':'Hospital Geral','06':'Hospital Especializado','07':'Unidade Mista',
  '15':'Unidade de Apoio Diagnose e Terapia','20':'Pronto-socorro Geral',
  '21':'Pronto-socorro Especializado','22':'Consultório Isolado',
  '32':'Unidade Móvel Fluvial','36':'Clínica / Centro de Especialidade',
  '39':'Unidade de Apoio','40':'Unidade Mista','42':'Centro de Parto Normal',
  '43':'Hospital Dia - Isolado','45':'UPA 24h','50':'Hospital Geral',
  '61':'Centro de Hemoterapia','62':'Hospital Dia','64':'Central de Regulação Médica',
  '67':'Laboratório Central de Saúde Pública','70':'Centro de Atenção Psicossocial',
  '71':'Centro de Atenção Hemoterapia e ou Hematologia',
  '72':'Centro de Imunização','73':'Pronto-atendimento',
  '74':'Centro de Apoio a Saúde da Família','75':'Telessaúde','76':'Central Municipal',
  '78':'Unidade de Atenção em Saúde Indígena','80':'Laboratório de Saúde Pública',
  '81':'Laboratório Municipal','82':'Farmácia','85':'CAPS','86':'Residência Terapêutica',
};

function _decodeTipoUnidade(codigo) {
  if (!codigo) return '';
  const k = String(codigo).padStart(2, '0');
  return TIPO_UNIDADE[k] || `Tipo ${k}`;
}

function normalizarEstabelecimento(brasilApi, cnes) {
  const b = brasilApi || {};
  const c = cnes || {};

  // Código CNES — nova API usa "codigo_cnes", API antiga usa "co_cnes"
  const codigoCNES = _first(c.codigo_cnes, c.co_cnes, c.cnes, c.nu_cnes, c.codigo_estabelecimento_saude);

  // Tipo — nova API devolve código numérico em "codigo_tipo_unidade"
  const tipoEstabelecimento = _first(
    c.ds_tipo_unidade, c.descricao_tipo_unidade,
    c.tipo_unidade,    c.tp_unidade,
    _decodeTipoUnidade(c.codigo_tipo_unidade)
  );

  // Endereço — nova API usa nomes mais descritivos
  const lat = c.latitude_estabelecimento_decimo_grau  ?? c.nu_latitude  ?? c.latitude  ?? null;
  const lng = c.longitude_estabelecimento_decimo_grau ?? c.nu_longitude ?? c.longitude ?? null;

  return {
    razaoSocial:     _first(b.razao_social,       c.nome_razao_social,   c.no_razao_social,   c.razao_social),
    nomeFantasia:    _first(b.nome_fantasia,       c.nome_fantasia,       c.no_fantasia),
    cnpj:            _first(b.cnpj,               c.numero_cnpj,         c.numero_cnpj_entidade, c.nu_cnpj, c.cnpj),
    codigoCNES,
    tipoEstabelecimento,
    enderecoLogradouro: _first(c.endereco_estabelecimento, c.no_logradouro, c.logradouro,    b.logradouro),
    enderecoNumero:     _first(c.numero_estabelecimento,   c.nu_endereco,   c.numero,        b.numero),
    enderecoBairro:     _first(c.bairro_estabelecimento,   c.no_bairro,     c.bairro,        b.bairro),
    // Município: nova API só tem código — preferir BrasilAPI que tem o nome
    enderecoCidade:     _first(b.municipio,               c.no_municipio,  c.municipio),
    // Estado: nova API tem codigo_uf (número) — preferir BrasilAPI que tem sigla
    enderecoEstado:     _first(b.uf,                      c.sg_uf,         c.uf),
    enderecoCep:       (_first(c.codigo_cep_estabelecimento, c.co_cep, c.cep, b.cep)).replace(/\D/g, ''),
    telefoneContato:    _first(c.numero_telefone_estabelecimento, c.nu_telefone, c.telefone, b.ddd_telefone_1, b.ddd_fax),
    emailContato:       _first(c.endereco_email_estabelecimento, c.email),
    latitude:           lat != null ? parseFloat(lat)  : null,
    longitude:          lng != null ? parseFloat(lng)  : null,
    naturezaJuridica:   _first(b.natureza_juridica?.descricao,  c.descricao_natureza_juridica_estabelecimento, c.ds_natureza_juridica),
    atividadePrincipal: b.atividade_principal?.[0]?.text || '',
    tipoGestao:         _decodeTipoGestao(_first(c.tipo_gestao, c.ds_tipo_gestao, c.gestao)),
    esferaAdministrativa: _first(c.descricao_esfera_administrativa, c.esfera_administrativa),
    nivelHierarquia:    _first(c.descricao_nivel_hierarquia, c.nivel_hierarquia),
    turnoAtendimento:   _first(c.descricao_turno_atendimento, c.ds_turno_atendimento, c.turno_atendimento, c.turno),
    possuiCentroCirurgico:   c.estabelecimento_possui_centro_cirurgico    != null ? !!Number(c.estabelecimento_possui_centro_cirurgico)    : null,
    possuiCentroObstetrico:  c.estabelecimento_possui_centro_obstetrico   != null ? !!Number(c.estabelecimento_possui_centro_obstetrico)   : null,
    possuiAtendimentoHosp:   c.estabelecimento_possui_atendimento_hospitalar != null ? !!Number(c.estabelecimento_possui_atendimento_hospitalar) : null,
    possuiAtendimentoAmb:    c.estabelecimento_possui_atendimento_ambulatorial != null ? !!Number(c.estabelecimento_possui_atendimento_ambulatorial) : null,
    possuiServApoio:         c.estabelecimento_possui_servico_apoio        != null ? !!Number(c.estabelecimento_possui_servico_apoio)        : null,
  };
}

function normalizarLeitos(lista) {
  if (!Array.isArray(lista) || !lista.length) return null;

  let totalExistentes = 0, totalSus = 0, totalNaoSus = 0, totalContratados = 0;
  const detalhes = [];

  for (const item of lista) {
    // Nova API CNES usa nomes longos descritivos
    const desc = item.descricao_leito            || item.ds_leito          || item.tp_leito    ||
                 item.no_leito                   || item.tipo_leito        || item.descricao   || item.tipo || '';
    const exist = Number(
      item.quantidade_existente  ?? item.qt_exist        ?? item.qt_existente  ??
      item.qtd_exist             ?? item.existente       ?? item.quantidade    ?? 0);
    const sus   = Number(
      item.quantidade_sus        ?? item.qt_sus          ?? item.qtd_sus       ?? item.sus      ?? 0);
    const naoSus= Number(
      item.quantidade_nao_sus    ?? item.qt_nsus         ?? item.qt_nao_sus    ??
      item.qtd_nao_sus           ?? item.nao_sus         ?? 0);
    const contrat = Number(
      item.quantidade_contratado ?? item.qt_contratado   ?? item.qt_contract   ?? item.contratado ?? 0);

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
      nome:       item.descricao_equipamento || item.ds_equipamento  || item.no_equipamento || item.descricao || item.nome || '',
      quantidade: Number(item.quantidade_existente ?? item.qt_exist  ?? item.qtd_existente  ?? item.existente  ?? item.quantidade ?? 0),
      emUso:      Number(item.quantidade_em_uso    ?? item.qt_em_uso ?? item.qtd_em_uso     ?? item.em_uso     ?? 0),
    }))
    .filter(e => e.nome && e.quantidade > 0)
    .sort((a, b) => b.quantidade - a.quantidade);
}

function normalizarServicos(lista) {
  if (!Array.isArray(lista) || !lista.length) return [];
  return lista
    .map(item => ({
      servico:       item.descricao_servico || item.ds_servico      || item.no_servico    || item.descricao  || item.servico || '',
      classificacao: item.descricao_classificacao || item.ds_classificacao || item.classificacao || '',
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

  // Determinar código CNES — nova API usa "codigo_cnes", antiga usava "co_cnes"
  const coCnes = cnesBasico
    ? (cnesBasico.codigo_cnes || cnesBasico.co_cnes || cnesBasico.cnes ||
       cnesBasico.nu_cnes     || cnesBasico.codigo_estabelecimento_saude || null)
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
