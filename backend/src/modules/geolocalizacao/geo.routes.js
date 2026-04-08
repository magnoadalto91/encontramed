'use strict';

const router = require('express').Router();
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const { haversineKm } = require('../../utils/haversine');
const logger = require('../../utils/logger');
const auth = require('../../middlewares/auth.middleware');
const prisma = new PrismaClient();
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

const NOMINATIM_URL = process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org';
const USER_AGENT = process.env.NOMINATIM_USER_AGENT || 'EncontraMed/1.0';

router.get('/geocodificar', wrap(async (req, res) => {
  const { endereco } = req.query;
  if (!endereco) return res.status(400).json({ error: 'Endereço é obrigatório' });

  try {
    const resp = await axios.get(`${NOMINATIM_URL}/search`, {
      params: { q: endereco, format: 'json', limit: 1, countrycodes: 'br' },
      headers: { 'User-Agent': USER_AGENT },
      timeout: 10000,
    });
    if (!resp.data?.length) return res.json(null);
    const r = resp.data[0];
    res.json({ latitude: parseFloat(r.lat), longitude: parseFloat(r.lon), display_name: r.display_name });
  } catch (err) {
    logger.warn('[geo] Geocodificação falhou:', err.message);
    res.status(503).json({ error: 'Serviço de geolocalização temporariamente indisponível' });
  }
}));

router.get('/reverso', wrap(async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'Lat e lng são obrigatórios' });

  try {
    const resp = await axios.get(`${NOMINATIM_URL}/reverse`, {
      params: { lat, lon: lng, format: 'json' },
      headers: { 'User-Agent': USER_AGENT },
      timeout: 10000,
    });
    res.json(resp.data?.address || null);
  } catch (err) {
    logger.warn('[geo] Geocodificação reversa falhou:', err.message);
    res.status(503).json({ error: 'Serviço de geolocalização temporariamente indisponível' });
  }
}));

router.get('/medicos-proximos', auth, wrap(async (req, res) => {
  const { lat, lng, raioKm = 20, especialidadeId } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'Lat e lng são obrigatórios' });

  const latN = parseFloat(lat);
  const lngN = parseFloat(lng);
  const raio = parseFloat(raioKm);

  const where = { crmStatus: 'ATIVO', latitude: { not: null } };
  if (especialidadeId) where.especialidades = { some: { especialidadeId: Number(especialidadeId) } };

  const medicos = await prisma.medicos.findMany({
    where,
    include: { usuario: { select: { nomeCompleto: true } }, especialidades: { include: { especialidade: true } } },
  });

  const proximos = medicos
    .filter(m => m.latitude && haversineKm(latN, lngN, m.latitude, m.longitude) <= raio)
    .map(m => ({ ...m, distanciaKm: haversineKm(latN, lngN, m.latitude, m.longitude) }))
    .sort((a, b) => a.distanciaKm - b.distanciaKm);

  res.json(proximos);
}));

module.exports = router;
