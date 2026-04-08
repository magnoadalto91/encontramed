// Module-level error buffer — persists during JS session
// Implements LGPD-compliant diagnostic log with PII sanitization
const _buffer = [];
const MAX = 20;

function sanitizar(str) {
  if (!str) return '';
  return String(str)
    .replace(/Bearer\s+[\w.-]+/gi, '[TOKEN]')
    .replace(/eyJ[\w.-]+/g, '[JWT]')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/gi, '[EMAIL]')
    .replace(/\b\d{11}\b/g, '[CPF]')
    .replace(/"senha"\s*:\s*"[^"]*"/gi, '"senha":"[REDACTED]"');
}

function push(entry) {
  if (_buffer.length >= MAX) _buffer.shift();
  _buffer.push({
    ts: new Date().toISOString(),
    tipo: entry.tipo,
    msg: sanitizar(entry.msg),
    stack: sanitizar(entry.stack || ''),
  });
}

export function instalarHandlers() {
  // 1. Crashes JS fatais
  if (typeof ErrorUtils !== 'undefined') {
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      push({
        tipo: isFatal ? 'fatal' : 'error',
        msg: error.message,
        stack: error.stack,
      });
    });
  }

  // 2. console.error override
  const origError = console.error.bind(console);
  console.error = (...args) => {
    push({ tipo: 'console.error', msg: args.map(String).join(' '), stack: '' });
    origError(...args);
  };

  // 3. Unhandled promise rejections
  if (typeof global !== 'undefined' && global.addEventListener) {
    global.addEventListener('unhandledrejection', (e) => {
      push({
        tipo: 'unhandledrejection',
        msg: String(e.reason),
        stack: e.reason?.stack || '',
      });
    });
  }
}

export const getLogBuffer = () => [..._buffer];
export const clearLogBuffer = () => {
  _buffer.length = 0;
};
