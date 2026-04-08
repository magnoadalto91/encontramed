'use strict';

/**
 * Restricts access to HOSPITAL role only.
 * Must be used AFTER authMiddleware.
 */
function hospitalMiddleware(req, res, next) {
  if (req.role !== 'HOSPITAL') {
    return res.status(403).json({ error: 'Acesso negado. Área restrita a hospitais.' });
  }
  next();
}

module.exports = hospitalMiddleware;
