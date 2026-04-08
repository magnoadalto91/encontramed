'use strict';

const rateLimit = require('express-rate-limit');

// express-rate-limit v7 handles IPv6 natively in its default keyGenerator.
// For custom keyGenerators, normalize IPv6-mapped IPv4 (::ffff:x.x.x.x → x.x.x.x).
const normalizeIp = (ip) => {
  if (!ip) return 'unknown';
  if (ip.startsWith('::ffff:')) return ip.slice(7);
  return ip;
};

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
  keyGenerator: (req) => normalizeIp(req.ip),
});

/**
 * Registration — 5 requests per hour per IP.
 * Route: POST /auth/register
 */
const registerLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => normalizeIp(req.ip),
});

/**
 * Email operations — 3 requests per 15 minutes per IP.
 * Routes: POST /auth/verificar, POST /auth/reenviar-verificacao
 */
const emailLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => normalizeIp(req.ip),
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
    req.userId ? String(req.userId) : normalizeIp(req.ip),
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
    req.userId ? String(req.userId) : normalizeIp(req.ip),
});

module.exports = {
  loginLimiter,
  registerLimiter,
  emailLimiter,
  candidaturaLimiter,
  uploadLimiter,
};
