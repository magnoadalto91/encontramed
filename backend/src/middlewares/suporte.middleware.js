'use strict';

/**
 * Allows access to ADMIN and SUPORTE roles.
 * Must be used AFTER authMiddleware.
 */
function suporteMiddleware(req, res, next) {
  if (!['ADMIN', 'SUPORTE'].includes(req.role)) {
    return res.status(403).json({ error: 'Acesso negado. Área restrita a administradores e suporte.' });
  }
  next();
}

module.exports = suporteMiddleware;
