'use strict';

const logger = require('../utils/logger');

/**
 * Global Express error handler middleware.
 * In production: logs only the message (no stack trace leak).
 * In development: logs full error with stack for debugging.
 *
 * Must be registered LAST with app.use() after all routes.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    logger.error(`${req.method} ${req.path} — ${err.message}`);
  } else {
    logger.error(err);
  }

  // Handle CORS errors
  if (err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ error: err.message });
  }

  // Handle Prisma known errors
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Registro duplicado. Verifique os dados e tente novamente.' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Registro não encontrado.' });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Erro interno do servidor';

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
