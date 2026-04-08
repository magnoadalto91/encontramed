'use strict';
const express = require('express');
const router = express.Router();
const svc = require('./wallet.service');
const auth = require('../../middlewares/auth.middleware');

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

router.get('/medico', auth, wrap(async (req, res) => {
  res.json(await svc.getWalletMedico(req.userId));
}));

module.exports = router;
