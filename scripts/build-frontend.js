/**
 * EncontraMed - Build Script
 * Copies frontend/admin → backend/public/admin
 * Obfuscates inline <script> blocks for security
 * Run: node scripts/build-frontend.js
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'frontend', 'admin');
const DST_DIR = path.join(__dirname, '..', 'backend', 'public', 'admin');

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
console.log(`[build] Source: ${SRC_DIR}`);
console.log(`[build] Destination: ${DST_DIR}`);

if (!fs.existsSync(SRC_DIR)) {
  console.error(`[build] ERROR: Source directory not found: ${SRC_DIR}`);
  process.exit(1);
}

// Clean destination
if (fs.existsSync(DST_DIR)) {
  fs.rmSync(DST_DIR, { recursive: true });
  console.log('[build] Cleaned destination directory');
}

copyRecursive(SRC_DIR, DST_DIR);

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
