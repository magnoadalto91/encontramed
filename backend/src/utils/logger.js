'use strict';

const isProd = process.env.NODE_ENV === 'production';

function formatMsg(level, ...args) {
  const ts = new Date().toISOString();
  return [`[${ts}] [${level}]`, ...args];
}

const logger = {
  info(...args) {
    console.log(...formatMsg('INFO', ...args));
  },

  warn(...args) {
    console.warn(...formatMsg('WARN', ...args));
  },

  error(msgOrError, ...rest) {
    if (isProd) {
      // In production: log message only, never expose stack trace
      const msg = msgOrError instanceof Error ? msgOrError.message : msgOrError;
      console.error(...formatMsg('ERROR', msg, ...rest));
    } else {
      // In development: full stack trace for debugging
      console.error(...formatMsg('ERROR', msgOrError, ...rest));
    }
  },

  debug(...args) {
    if (!isProd) {
      console.debug(...formatMsg('DEBUG', ...args));
    }
  },
};

module.exports = logger;
