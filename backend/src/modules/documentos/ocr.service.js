'use strict';

const logger = require('../../utils/logger');

/**
 * OCR Service using Tesseract.js
 * Extracts text from document images and PDFs.
 * Attempts structured extraction based on document type.
 */
async function processarDocumento(buffer, mimeType, tipo) {
  let Tesseract;
  try {
    Tesseract = require('tesseract.js');
  } catch {
    logger.warn('[ocr] tesseract.js não instalado. OCR desativado.');
    return { texto: '', dadosJson: null, confianca: 0 };
  }

  try {
    const { data } = await Tesseract.recognize(buffer, 'por', {
      logger: m => { if (m.status === 'recognizing text') logger.debug(`[ocr] ${Math.round(m.progress * 100)}%`); },
    });

    const texto = data.text || '';
    const confianca = data.confidence || 0;
    const dadosJson = _extrairDados(texto, tipo);

    logger.info(`[ocr] Tipo: ${tipo} | Confiança: ${confianca.toFixed(1)}%`);
    return { texto, dadosJson, confianca };

  } catch (err) {
    logger.error('[ocr] Erro no reconhecimento:', err.message);
    return { texto: '', dadosJson: null, confianca: 0 };
  }
}

function _extrairDados(texto, tipo) {
  const textoUpper = texto.toUpperCase();

  if (tipo === 'CARTEIRA_CRM') {
    // Extract CRM number — patterns: CRM-SP 123456, CRM/SP 123456, CRM: 123456
    const crmMatch = texto.match(/CRM[\s/\-]*(?:[A-Z]{2}[\s/\-]*)?\s*(\d{4,7})/i);
    const ufMatch = texto.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/);

    return {
      crm: crmMatch ? crmMatch[1] : null,
      uf: ufMatch ? ufMatch[1] : null,
    };
  }

  if (tipo === 'DIPLOMA') {
    const anoMatch = texto.match(/\b(19[5-9]\d|20[0-2]\d)\b/);
    const anoMaisRecente = anoMatch ? anoMatch[anoMatch.length - 1] : null;

    return {
      anoConclusao: anoMaisRecente,
      texto: texto.substring(0, 500),
    };
  }

  if (tipo === 'RQE_CERTIFICADO') {
    const rqeMatch = texto.match(/RQE[\s:]*(\d{4,8})/i);
    return {
      rqe: rqeMatch ? rqeMatch[1] : null,
    };
  }

  return { texto: texto.substring(0, 500) };
}

module.exports = { processarDocumento };
