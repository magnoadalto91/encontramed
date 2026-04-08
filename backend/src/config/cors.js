'use strict';

const ALLOWED_ORIGINS = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // Allow requests with no origin header (e.g. mobile native apps, Postman in dev)
    if (!origin) {
      return callback(null, true);
    }

    // In development: allow everything
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    // In production: strict allowlist only — no wildcards, no *.railway.app
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error(`CORS: origem não permitida — ${origin}`));
  },

  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

module.exports = corsOptions;
