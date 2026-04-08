'use strict';

const multer = require('multer');

// All uploads use memory storage — files are processed and sent to R2.
// NEVER use disk storage (Railway disk is ephemeral and wiped on redeploy).
const memStorage = multer.memoryStorage();

/**
 * Profile image / general image uploads.
 * Accepts: JPEG, PNG, WebP
 * Max size: 5MB
 */
const uploadImagem = multer({
  storage: memStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de imagem inválido. Use JPEG, PNG ou WebP.'));
    }
  },
});

/**
 * Medical document uploads (CRM card, diploma, RQE certificate, contracts).
 * Accepts: JPEG, PNG, WebP, PDF
 * Max size: 10MB
 */
const uploadDocumento = multer({
  storage: memStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
    const ext = (file.originalname || '').toLowerCase().slice(file.originalname.lastIndexOf('.'));

    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de documento inválido. Use JPEG, PNG, WebP ou PDF.'));
    }
  },
});

/**
 * Hospital logo uploads.
 * Accepts: JPEG, PNG, WebP
 * Max size: 2MB
 */
const uploadLogo = multer({
  storage: memStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de logo inválido. Use JPEG, PNG ou WebP.'));
    }
  },
});

module.exports = { uploadImagem, uploadDocumento, uploadLogo };
