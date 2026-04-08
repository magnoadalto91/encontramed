/**
 * EncontraMed - Build Script
 * Copies frontend/admin → backend/public/admin
 * Obfuscates inline <script> blocks for security
 * Run: node scripts/build-frontend.js
 */

const fs = require('fs');
const path = require('path');

const PORTALS = [
  { src: path.join(__dirname, '..', 'frontend', 'admin'),    dst: path.join(__dirname, '..', 'backend', 'public', 'admin') },
  { src: path.join(__dirname, '..', 'frontend', 'hospital'), dst: path.join(__dirname, '..', 'backend', 'public', 'hospital') },
];

// Backwards compat: keep single-portal vars for the main block below
const SRC_DIR = PORTALS[0].src;
const DST_DIR = PORTALS[0].dst;

// Try to load obfuscator — optional dependency
let JavaScriptObfuscator;
try {
  JavaScriptObfuscator = require('javascript-obfuscator');
} catch {
  console.warn('[build] javascript-obfuscator not found — skipping obfuscation');
  console.warn('[build] Install with: npm install javascript-obfuscator --save-dev');
}

const OBFUSCATOR_CONFIG = {
  compact: true,
  renameGlobals: false,           // CRITICAL: false → preserves onclick="" functions
  controlFlowFlattening: false,   // may break complex logic
  stringArray: true,
  stringArrayEncoding: ['base64'],
  selfDefending: false,
  debugProtection: false,
  sourceMap: false,
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyRecursive(src, dst) {
  ensureDir(dst);
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);

    if (entry.isDirectory()) {
      copyRecursive(srcPath, dstPath);
    } else if (entry.name.endsWith('.html')) {
      processHTML(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

function processHTML(srcPath, dstPath) {
  let content = fs.readFileSync(srcPath, 'utf8');

  if (JavaScriptObfuscator) {
    // Obfuscate inline <script> blocks (not src="" scripts)
    content = content.replace(
      /<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi,
      (match, jsCode) => {
        if (!jsCode.trim()) return match;
        try {
          const obfuscated = JavaScriptObfuscator.obfuscate(jsCode, OBFUSCATOR_CONFIG).getObfuscatedCode();
          return match.replace(jsCode, `\n${obfuscated}\n`);
        } catch (err) {
          console.warn(`[build] Obfuscation failed for ${path.basename(srcPath)}: ${err.message}`);
          return match;
        }
      }
    );
  }

  fs.writeFileSync(dstPath, content, 'utf8');
}

// ─── Main ────────────────────────────────────────────────────────────────────

console.log('[build] EncontraMed frontend build starting...');

for (const portal of PORTALS) {
  console.log(`[build] Processing: ${path.basename(portal.src)}`);
  console.log(`[build]   Source: ${portal.src}`);
  console.log(`[build]   Dest:   ${portal.dst}`);

  if (!fs.existsSync(portal.src)) {
    console.warn(`[build] SKIP: Source not found: ${portal.src}`);
    continue;
  }

  if (fs.existsSync(portal.dst)) {
    fs.rmSync(portal.dst, { recursive: true });
  }

  copyRecursive(portal.src, portal.dst);
  console.log(`[build] Done: ${path.basename(portal.src)}`);
}

// Copy logo to public
const logoSrc = path.join(__dirname, '..', 'Arquivos', 'logo.png');
const logoDst = path.join(__dirname, '..', 'backend', 'public', 'logo.png');
if (fs.existsSync(logoSrc)) {
  ensureDir(path.dirname(logoDst));
  fs.copyFileSync(logoSrc, logoDst);
  console.log('[build] Copied logo.png');
}

console.log('[build] Done!');
console.log(`[build] Output: ${DST_DIR}`);
