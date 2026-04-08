'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../../utils/logger');

async function listar(userId) {
  const hospital = await prisma.hospitais.findFirst({ where: { usuarioId: userId } });
  return prisma.escalas.findMany({
    where: { hospitalId: hospital.id },
    include: { especialidade: true, _count: { select: { plantoes: true } } },
    orderBy: { criadoEm: 'desc' },
  });
}

async function criar(data, userId) {
  const hospital = await prisma.hospitais.findFirst({ where: { usuarioId: userId } });
  const { nome, tipo, especialidadeId, configuracao, dataInicio, dataFim, valorBase, exigeRQE } = data;

  const escala = await prisma.escalas.create({
    data: {
      hospitalId: hospital.id,
      especialidadeId: Number(especialidadeId),
      nome,
      tipo,
      configuracao,
      dataInicio: new Date(dataInicio),
      dataFim: dataFim ? new Date(dataFim) : null,
      valorBase: Number(valorBase),
      exigeRQE: !!exigeRQE,
    },
  });

  // Generate initial batch of plantoes
  await generatePlantoes(escala.id, 60);
  return escala;
}

async function getById(id, userId) {
  const escala = await prisma.escalas.findUnique({
    where: { id: Number(id) },
    include: { especialidade: true, hospital: true },
  });
  if (!escala) throw Object.assign(new Error('Escala não encontrada'), { status: 404 });
  return escala;
}

async function pausar(id, userId) {
  const hospital = await prisma.hospitais.findFirst({ where: { usuarioId: userId } });
  const escala = await prisma.escalas.findUnique({ where: { id: Number(id) } });
  if (!escala || escala.hospitalId !== hospital.id) throw Object.assign(new Error('Acesso negado'), { status: 403 });
  return prisma.escalas.update({ where: { id: Number(id) }, data: { ativo: false } });
}

async function reativar(id, userId) {
  const hospital = await prisma.hospitais.findFirst({ where: { usuarioId: userId } });
  const escala = await prisma.escalas.findUnique({ where: { id: Number(id) } });
  if (!escala || escala.hospitalId !== hospital.id) throw Object.assign(new Error('Acesso negado'), { status: 403 });
  const updated = await prisma.escalas.update({ where: { id: Number(id) }, data: { ativo: true } });
  await generatePlantoes(Number(id), 60);
  return updated;
}

/**
 * Generate plantoes for an escala up to horizonDays in the future.
 * Skips dates where plantao already exists to be idempotent.
 */
async function generatePlantoes(escalaId, horizonDays = 60) {
  const escala = await prisma.escalas.findUnique({
    where: { id: escalaId },
    include: { hospital: true },
  });
  if (!escala || !escala.ativo) return;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const limite = new Date(hoje);
  limite.setDate(limite.getDate() + horizonDays);
  const fimEscala = escala.dataFim ? new Date(escala.dataFim) : limite;
  const ate = fimEscala < limite ? fimEscala : limite;

  const datas = _calcularDatas(escala, hoje, ate);
  let gerados = 0;

  for (const { dataInicio, dataFim } of datas) {
    const existing = await prisma.plantoes.findFirst({
      where: { escalaId, dataInicio: { gte: dataInicio, lt: new Date(dataInicio.getTime() + 60000) } },
    });
    if (existing) continue;

    const duracaoHoras = (dataFim - dataInicio) / (1000 * 60 * 60);
    await prisma.plantoes.create({
      data: {
        hospitalId: escala.hospitalId,
        especialidadeId: escala.especialidadeId,
        escalaId,
        tipo: 'ESCALA',
        status: 'ABERTO',
        dataInicio,
        dataFim,
        duracaoHoras,
        valorBase: escala.valorBase,
        exigeRQE: escala.exigeRQE,
        latitude: escala.hospital.latitude,
        longitude: escala.hospital.longitude,
      },
    });
    gerados++;
  }

  await prisma.escalas.update({ where: { id: escalaId }, data: { geradoAte: ate } });
  logger.info(`[escalas] Escala ${escalaId}: ${gerados} plantões gerados`);
  return gerados;
}

function _calcularDatas(escala, inicio, fim) {
  const datas = [];
  const cfg = escala.configuracao;

  if (escala.tipo === 'PERSONALIZADO') {
    for (const d of (cfg.datas || [])) {
      const dataInicio = _parseDateTime(d, cfg.horaInicio || '07:00');
      const dataFim = _parseDateTime(d, cfg.horaFim || '19:00');
      if (cfg.horaFim < cfg.horaInicio) dataFim.setDate(dataFim.getDate() + 1);
      if (dataInicio >= inicio && dataInicio <= fim) datas.push({ dataInicio, dataFim });
    }
    return datas;
  }

  const diasSemana = cfg.diasSemana || [];
  const diaMes = cfg.diaMes;
  const intervalo = cfg.intervaloSemanas || 1;
  const horaInicio = cfg.horaInicio || '07:00';
  const horaFim = cfg.horaFim || '19:00';

  const cursor = new Date(inicio);
  let semanaRef = 0;

  while (cursor <= fim) {
    let incluir = false;

    if (escala.tipo === 'MENSAL' && diaMes) {
      incluir = cursor.getDate() === diaMes;
    } else if (escala.tipo === 'SEMANAL' || escala.tipo === 'QUINZENAL') {
      const diaSemana = cursor.getDay(); // 0=Sun, 1=Mon...
      if (diasSemana.includes(diaSemana)) {
        const semAtual = Math.floor((cursor - inicio) / (7 * 24 * 3600 * 1000));
        incluir = (semAtual % intervalo === 0);
      }
    }

    if (incluir) {
      const dataInicio = _parseDateTime(cursor.toISOString().split('T')[0], horaInicio);
      const dataFim = _parseDateTime(cursor.toISOString().split('T')[0], horaFim);
      if (horaFim < horaInicio) dataFim.setDate(dataFim.getDate() + 1);
      if (dataInicio >= new Date(escala.dataInicio)) {
        datas.push({ dataInicio, dataFim });
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return datas;
}

function _parseDateTime(dateStr, timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(dateStr);
  d.setHours(h, m, 0, 0);
  return d;
}

module.exports = { listar, criar, getById, pausar, reativar, generatePlantoes };
