'use strict';

/**
 * CFM CRM Scraper
 * Validates doctor CRM against CFM (Conselho Federal de Medicina) portal.
 *
 * Requires: npm install playwright && npx playwright install chromium
 *
 * The CFM portal does not offer a public API, so we use Playwright to
 * automate a headless browser and extract the verification result.
 */

const logger = require('../../utils/logger');

const CFM_URL = process.env.CFM_PORTAL_URL || 'https://sistemas.cfm.org.br/verificacrm/';
const TIMEOUT_MS = 30000;
const MAX_RETRIES = 2;

/**
 * Validate a CRM number against the CFM portal.
 * @param {string} crm - CRM number (digits only)
 * @param {string} uf  - State abbreviation (e.g., 'SP')
 * @returns {Promise<{nome: string, status: string, especialidades: string[], rqes: string[]}>}
 */
async function validarCRM(crm, uf) {
  let playwright;
  try {
    playwright = require('playwright');
  } catch {
    logger.warn('[crm.scraper] Playwright não instalado. Use: npm install playwright && npx playwright install chromium');
    return _mockResult(crm, uf);
  }

  let browser;
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      browser = await playwright.chromium.launch({
        headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        locale: 'pt-BR',
      });

      const page = await context.newPage();
      page.setDefaultTimeout(TIMEOUT_MS);

      await page.goto(CFM_URL, { waitUntil: 'networkidle' });

      // Fill CRM and UF
      await page.selectOption('select[name*="uf"], select[id*="uf"], select[name*="estado"]', uf.toUpperCase()).catch(() => {});
      await page.fill('input[name*="crm"], input[id*="crm"], input[type="text"]', String(crm));
      await page.click('button[type="submit"], input[type="submit"]');

      await page.waitForSelector('.resultado, .resultado-busca, table, .medico-dados', { timeout: TIMEOUT_MS }).catch(() => {});

      const content = await page.content();
      const result = _parseResult(content, crm, uf);

      await browser.close();
      logger.info(`[crm.scraper] CRM ${crm}/${uf} validado: ${result.status}`);
      return result;

    } catch (err) {
      lastError = err;
      logger.warn(`[crm.scraper] Tentativa ${attempt}/${MAX_RETRIES} falhou: ${err.message}`);
      if (browser) {
        try { await browser.close(); } catch {}
        browser = null;
      }
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 2000 * attempt));
      }
    }
  }

  logger.error('[crm.scraper] Todas as tentativas falharam:', lastError?.message);
  throw Object.assign(new Error('Falha ao validar CRM no portal CFM. Tente novamente mais tarde.'), { status: 503 });
}

function _parseResult(html, crm, uf) {
  // Parse the CFM response HTML
  // This is a best-effort parser — CFM may change their HTML structure
  const lowerHtml = html.toLowerCase();

  let status = 'NAO_VERIFICADO';
  let nome = '';
  const especialidades = [];
  const rqes = [];

  // Detect status keywords
  if (lowerHtml.includes('ativo') && !lowerHtml.includes('inativo')) {
    status = 'ATIVO';
  } else if (lowerHtml.includes('inativo')) {
    status = 'INATIVO';
  } else if (lowerHtml.includes('suspenso')) {
    status = 'SUSPENSO';
  } else if (lowerHtml.includes('cancelado')) {
    status = 'CANCELADO';
  }

  // Try to extract name from common patterns
  const nomeMatch = html.match(/nome[^:]*:\s*<[^>]*>([^<]+)/i) ||
                    html.match(/médico[^:]*:\s*([A-ZÁÉÍÓÚÀÃÕÂÊ\s]+)/i);
  if (nomeMatch) nome = nomeMatch[1].trim();

  // Try to extract especialidades
  const espMatches = html.matchAll(/RQE[^\d]*(\d+)[^<]*<[^>]*>([^<]+)/gi);
  for (const match of espMatches) {
    rqes.push(match[1]);
    especialidades.push(match[2].trim());
  }

  return { nome, status, especialidades, rqes };
}

function _mockResult(crm, uf) {
  logger.warn(`[crm.scraper] Retornando mock para CRM ${crm}/${uf} (Playwright não disponível)`);
  return {
    nome: '',
    status: 'NAO_VERIFICADO',
    especialidades: [],
    rqes: [],
    mock: true,
  };
}

module.exports = { validarCRM };
