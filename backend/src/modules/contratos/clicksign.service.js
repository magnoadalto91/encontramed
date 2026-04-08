'use strict';

const axios = require('axios');
const logger = require('../../utils/logger');

const BASE_URL = process.env.CLICKSIGN_BASE_URL || 'https://app.clicksign.com';
const TOKEN = process.env.CLICKSIGN_ACCESS_TOKEN;

function isConfigured() {
  if (!TOKEN) {
    logger.warn('[clicksign] CLICKSIGN_ACCESS_TOKEN não configurado. Assinatura digital desativada.');
    return false;
  }
  return true;
}

/**
 * Create a document in Clicksign for digital signature.
 * @param {Buffer} pdfBuffer - PDF content
 * @param {Array} signatarios - [{ email, nome, cpf }]
 * @returns {Promise<{docKey: string, signUrl: string}>}
 */
async function criarDocumento(pdfBuffer, signatarios) {
  if (!isConfigured()) return _mockDocumento();

  try {
    const base64 = pdfBuffer.toString('base64');

    const resp = await axios.post(`${BASE_URL}/api/v1/documents`, {
      document: {
        path: `/encontramed/contrato_${Date.now()}.pdf`,
        content_base64: `data:application/pdf;base64,${base64}`,
        deadline_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        auto_close: true,
        locale: 'pt-BR',
      },
    }, {
      params: { access_token: TOKEN },
      timeout: 30000,
    });

    const docKey = resp.data.document.key;

    // Add signatories
    for (const s of signatarios) {
      await axios.post(`${BASE_URL}/api/v1/lists`, {
        list: { document_key: docKey, signer: { email: s.email, phone_number: s.telefone }, sign_as: 'sign' },
      }, { params: { access_token: TOKEN } });
    }

    // Get sign URL for first signatory
    const signUrl = `${BASE_URL}/sign/${docKey}`;

    return { docKey, signUrl };
  } catch (err) {
    logger.error('[clicksign] Erro ao criar documento:', err.message);
    throw Object.assign(new Error('Falha ao criar contrato digital. Tente novamente.'), { status: 503 });
  }
}

/**
 * Verify Clicksign webhook signature.
 */
function verificarWebhook(payload, key) {
  const webhookSecret = process.env.CLICKSIGN_WEBHOOK_SECRET;
  if (!webhookSecret) return true; // Accept if not configured (dev mode)
  return key === webhookSecret;
}

function _mockDocumento() {
  const mockKey = `mock_${Date.now()}`;
  return { docKey: mockKey, signUrl: `#mock-signature-${mockKey}`, mock: true };
}

module.exports = { criarDocumento, verificarWebhook };
