'use strict';

const rateLimit = require('express-rate-limit');

// IMPORTANT: Railway runs on IPv6. Using req.ip directly in keyGenerator causes
// ERR_ERL_KEY_GEN_IPV6. Always use ipKeyGenerator from express-rate-limit.
const { ipKeyGenerator } = rateLimit;

/**
 * Standard options applied to all limiters.
 * legacyHeaders: false — use RateLimit-* headers (RFC 6585 draft)
 * standardHeaders: true — expose X-RateLimit-* headers
 */
const baseOptions = {
  legacyHeaders: false,
  standardHeaders: true,
  handler(req, res) {
    res.status(429).json({
      error: 'Muitas tentativas. Tente novamente mais tarde.',
    });
  },
};

/**
 * Login and password recovery — 10 requests per 15 minutes per IP.
 * Routes: POST /auth/login, POST /auth/recuperar-senha
 */
const loginLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
});

/**
 * Registration — 5 requests per hour per IP.
 * Route: POST /auth/register
 */
const registerLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
});

/**
 * Email operations — 3 requests per 15 minutes per IP.
 * Routes: POST /auth/verificar, POST /auth/reenviar-verificacao
 */
const emailLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
});

/**
 * Candidatura submission — 20 per hour per authenticated userId (or IP fallback).
 * Prevents rapid candidatura spam.
 */
const candidaturaLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) =>
    req.userId ? String(req.userId) : ipKeyGenerator(req.ip),
});

/**
 * File upload — 5 per hour per authenticated userId (or IP fallback).
 * Prevents storage abuse.
 */
const uploadLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) =>
    req.userId ? String(req.userId) : ipKeyGenerator(req.ip),
});

module.exports = {
  loginLimiter,
  registerLimiter,
  emailLimiter,
  candidaturaLimiter,
  uploadLimiter,
};
