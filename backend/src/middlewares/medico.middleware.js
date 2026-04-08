'use strict';

/**
 * Restricts access to MEDICO role only.
 * Must be used AFTER authMiddleware.
 */
function medicoMiddleware(req, res, next) {
  if (req.role !== 'MEDICO') {
    return res.status(403).json({ error: 'Acesso negado. Área restrita a médicos.' });
  }
  next();
}

module.exports = medicoMiddleware;
