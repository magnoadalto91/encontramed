'use strict';

/**
 * Restricts access to ADMIN role only.
 * Must be used AFTER authMiddleware.
 */
function adminMiddleware(req, res, next) {
  if (req.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso negado. Área restrita a administradores.' });
  }
  next();
}

module.exports = adminMiddleware;
