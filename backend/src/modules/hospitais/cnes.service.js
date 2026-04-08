'use strict';

const axios = require('axios');
const logger = require('../../utils/logger');

const CNES_API = 'https://apidadosabertos.saude.gov.br/cnes';

/**
 * Fetch hospital data from CNES by CNPJ.
 * Falls back to a mock structure if the API is unavailable.
 */
async function buscarPorCNPJ(cnpj) {
  const cnpjLimpo = cnpj.replace(/\D/g, '');

  try {
    const resp = await axios.get(`${CNES_API}/estabelecimentos`, {
      params: { cnpj: cnpjLimpo, limit: 1 },
      timeout: 10000,
      headers: { Accept: 'application/json' },
    });

    const data = resp.data?.dados?.[0] || resp.data?.[0];
    if (!data) return null;

    return _normalizar(data);
  } catch (err) {
    logger.warn(`[cnes] Falha ao buscar CNPJ ${cnpjLimpo}: ${err.message}`);
    return null;
  }
}

/**
 * Fetch hospital data from CNES by CNES code.
 */
async function buscarPorCodigo(codigoCNES) {
  try {
    const resp = await axios.get(`${CNES_API}/estabelecimentos/${codigoCNES}`, {
      timeout: 10000,
      headers: { Accept: 'application/json' },
    });
    return _normalizar(resp.data);
  } catch (err) {
    logger.warn(`[cnes] Falha ao buscar CNES ${codigoCNES}: ${err.message}`);
    return null;
  }
}

function _normalizar(data) {
  return {
    codigoCNES: data.co_cnes || data.codigo_cnes || '',
    razaoSocial: data.no_razao_social || data.razao_social || '',
    nomeFantasia: data.no_fantasia || data.nome_fantasia || '',
    cnpj: data.nu_cnpj || data.cnpj || '',
    tipoEstabelecimento: data.ds_tipo_unidade || data.tipo_unidade || '',
    enderecoLogradouro: data.no_logradouro || data.logradouro || '',
    enderecoNumero: data.nu_endereco || data.numero || '',
    enderecoBairro: data.no_bairro || data.bairro || '',
    enderecoCidade: data.no_municipio || data.municipio || '',
    enderecoEstado: data.sg_uf || data.uf || '',
    enderecoCep: (data.co_cep || data.cep || '').replace(/\D/g, ''),
    telefoneContato: data.nu_telefone || data.telefone || '',
  };
}

module.exports = { buscarPorCNPJ, buscarPorCodigo };
