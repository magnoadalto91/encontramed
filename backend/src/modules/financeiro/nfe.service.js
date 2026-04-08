'use strict';

const axios = require('axios');
const logger = require('../../utils/logger');

const TOKEN = process.env.FOCUSNFE_TOKEN;
const ENV = process.env.FOCUSNFE_ENVIRONMENT || 'homologacao';
const BASE_URL = ENV === 'producao'
  ? 'https://api.focusnfe.com.br'
  : 'https://homologacao.focusnfe.com.br';

function isConfigured() {
  if (!TOKEN) {
    logger.warn('[nfe] FOCUSNFE_TOKEN não configurado. Emissão de NF desativada.');
    return false;
  }
  return true;
}

async function prepararNFe(transacao) {
  return {
    serie: '1',
    numero: String(transacao.id).padStart(9, '0'),
    dataEmissao: new Date().toISOString().split('T')[0],
    naturezaOperacao: 'Prestação de Serviços Médicos',
    prestador: {
      cnpj: transacao.medico?.cnpj,
      inscricaoMunicipal: '',
      razaoSocial: transacao.medico?.razaoSocial,
    },
    tomador: {
      cnpj: transacao.hospital?.cnpj,
      razaoSocial: transacao.hospital?.razaoSocial,
    },
    servico: {
      aliquota: 5,
      baseCalculo: Number(transacao.valorLiquido),
      discriminacao: `Plantão médico em ${transacao.hospital?.razaoSocial} - ${new Date(transacao.plantao?.dataInicio).toLocaleDateString('pt-BR')}`,
      valorServicos: Number(transacao.valorLiquido),
    },
  };
}

async function emitirNFe(transacaoId, nfeData) {
  if (!isConfigured()) {
    logger.warn(`[nfe] Mock: NF não emitida para transação ${transacaoId}`);
    return { status: 'mock', numero: '000000001', serie: '1' };
  }

  try {
    const resp = await axios.post(`${BASE_URL}/v2/nfse`, nfeData, {
      auth: { username: TOKEN, password: '' },
      timeout: 30000,
    });
    return resp.data;
  } catch (err) {
    logger.error('[nfe] Erro ao emitir NFe:', err.response?.data || err.message);
    throw Object.assign(new Error('Falha ao emitir nota fiscal'), { status: 503 });
  }
}

async function consultarStatus(referencia) {
  if (!isConfigured()) return { status: 'mock' };

  try {
    const resp = await axios.get(`${BASE_URL}/v2/nfse/${referencia}`, {
      auth: { username: TOKEN, password: '' },
      timeout: 15000,
    });
    return resp.data;
  } catch (err) {
    logger.error('[nfe] Erro ao consultar status:', err.message);
    return { status: 'erro', mensagem: err.message };
  }
}

module.exports = { prepararNFe, emitirNFe, consultarStatus };
