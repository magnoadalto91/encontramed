'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { haversineKm } = require('../../utils/haversine');
const { sendToUser } = require('../../config/websocket');
const logger = require('../../utils/logger');

// Valid status transitions
const TRANSITIONS = {
  ABERTO:      ['CANDIDATADO', 'CANCELADO', 'EXPIRADO'],
  CANDIDATADO: ['CONFIRMADO', 'CANCELADO', 'EXPIRADO'],
  CONFIRMADO:  ['REALIZADO', 'CANCELADO'],
  REALIZADO:   ['PAGO'],
  PAGO:        [],
  CANCELADO:   [],
  EXPIRADO:    [],
};

function validateTransition(from, to) {
  if (!TRANSITIONS[from]?.includes(to)) {
    throw Object.assign(
      new Error(`Transição inválida: ${from} → ${to}`),
      { status: 409 }
    );
  }
}

async function listarDisponiveis(filters, medicoId) {
  const {
    especialidadeId, lat, lng, raioKm = 100,
    dataInicio, dataFim, valorMin, valorMax, urgente, permiteBid,
    page = 1, limit = 20,
  } = filters;

  const skip = (Number(page) - 1) * Number(limit);

  // Base raw SQL with Haversine distance if location provided
  if (lat && lng) {
    const latN = Number(lat);
    const lngN = Number(lng);
    const raioN = Number(raioKm);

    const whereConditions = [`p.status = 'ABERTO'`];
    const params = [latN, lngN, raioN, latN, lngN];
    let pi = 6;

    if (especialidadeId) { whereConditions.push(`p."especialidadeId" = $${pi++}`); params.push(Number(especialidadeId)); }
    if (dataInicio)       { whereConditions.push(`p."dataInicio" >= $${pi++}`);     params.push(new Date(dataInicio)); }
    if (dataFim)          { whereConditions.push(`p."dataFim" <= $${pi++}`);        params.push(new Date(dataFim)); }
    if (valorMin)         { whereConditions.push(`p."valorBase" >= $${pi++}`);      params.push(Number(valorMin)); }
    if (valorMax)         { whereConditions.push(`p."valorBase" <= $${pi++}`);      params.push(Number(valorMax)); }
    if (urgente === 'true') whereConditions.push(`p.urgente = true`);
    if (permiteBid === 'true') whereConditions.push(`p."permiteBid" = true`);

    const whereStr = whereConditions.join(' AND ');
    params.push(Number(limit), skip);

    const distanceExpr = `(6371 * acos(LEAST(1, cos(radians($1)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians($2)) + sin(radians($1)) * sin(radians(p.latitude)))))`;

    const sql = `
      SELECT p.*,
        ${distanceExpr} AS "distanciaKm",
        row_to_json(h.*) AS hospital,
        row_to_json(e.*) AS especialidade
      FROM plantoes p
      JOIN hospitais h ON h.id = p."hospitalId"
      JOIN especialidades e ON e.id = p."especialidadeId"
      WHERE ${whereStr}
        AND p.latitude IS NOT NULL
        AND (${distanceExpr}) <= $3
      ORDER BY "distanciaKm" ASC
      LIMIT $${pi++} OFFSET $${pi}
    `;

    const results = await prisma.$queryRawUnsafe(sql, ...params);
    return { plantoes: results, page: Number(page), limit: Number(limit) };
  }

  // Without geolocation — standard Prisma query
  const where = { status: 'ABERTO' };
  if (especialidadeId) where.especialidadeId = Number(especialidadeId);
  if (dataInicio)      where.dataInicio = { gte: new Date(dataInicio) };
  if (dataFim)         where.dataFim    = { lte: new Date(dataFim) };
  if (valorMin || valorMax) where.valorBase = { ...(valorMin && { gte: Number(valorMin) }), ...(valorMax && { lte: Number(valorMax) }) };
  if (urgente === 'true') where.urgente = true;
  if (permiteBid === 'true') where.permiteBid = true;

  const [plantoes, total] = await Promise.all([
    prisma.plantoes.findMany({
      where, skip, take: Number(limit),
      include: {
        hospital: { select: { id: true, razaoSocial: true, nomeFantasia: true, enderecoCidade: true, enderecoEstado: true, latitude: true, longitude: true } },
        especialidade: true,
        _count: { select: { candidaturas: true } },
      },
      orderBy: { criadoEm: 'desc' },
    }),
    prisma.plantoes.count({ where }),
  ]);

  return { plantoes, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
}

async function getById(id, userId, role) {
  const plantao = await prisma.plantoes.findUnique({
    where: { id: Number(id) },
    include: {
      hospital: true,
      especialidade: true,
      medico: { include: { usuario: { select: { nomeCompleto: true, email: true } } } },
      candidaturas: {
        include: { medico: { include: { usuario: { select: { nomeCompleto: true } }, especialidades: { include: { especialidade: true } } } }, bid: true },
        orderBy: { criadoEm: 'asc' },
      },
      bids: { orderBy: { criadoEm: 'desc' } },
    },
  });
  if (!plantao) throw Object.assign(new Error('Plantão não encontrado'), { status: 404 });
  return plantao;
}

async function criarPlantao(data, userId) {
  const hospital = await prisma.hospitais.findFirst({ where: { usuarioId: userId } });
  if (!hospital) throw Object.assign(new Error('Hospital não encontrado'), { status: 404 });

  const { especialidadeId, dataInicio, dataFim, valorBase, ...rest } = data;
  const esp = await prisma.especialidades.findUnique({ where: { id: Number(especialidadeId) } });
  if (!esp) throw Object.assign(new Error('Especialidade não encontrada'), { status: 404 });

  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);
  const duracaoHoras = (fim - inicio) / (1000 * 60 * 60);

  const plantao = await prisma.plantoes.create({
    data: {
      hospitalId: hospital.id,
      especialidadeId: Number(especialidadeId),
      dataInicio: inicio,
      dataFim: fim,
      duracaoHoras,
      valorBase: Number(valorBase),
      latitude: hospital.latitude,
      longitude: hospital.longitude,
      tipo: 'AVULSO',
      status: 'ABERTO',
      ...rest,
    },
  });

  // Notify nearby doctors for urgent shifts
  if (plantao.urgente) {
    notificarMedicosProximos(plantao.id, 20).catch(err => logger.error('[plantoes] Erro ao notificar:', err.message));
  }

  return plantao;
}

async function confirmarCandidatura(plantaoId, candidaturaId, userId) {
  const hospital = await prisma.hospitais.findFirst({ where: { usuarioId: userId } });
  const plantao = await prisma.plantoes.findUnique({ where: { id: Number(plantaoId) } });

  if (!plantao) throw Object.assign(new Error('Plantão não encontrado'), { status: 404 });
  if (plantao.hospitalId !== hospital.id) throw Object.assign(new Error('Acesso negado'), { status: 403 });
  if (!['ABERTO', 'CANDIDATADO'].includes(plantao.status)) {
    throw Object.assign(new Error(`Plantão não pode ser confirmado no status atual: ${plantao.status}`), { status: 409 });
  }

  const candidatura = await prisma.candidaturas.findUnique({
    where: { id: Number(candidaturaId) },
    include: { medico: true },
  });
  if (!candidatura || candidatura.plantaoId !== plantao.id) {
    throw Object.assign(new Error('Candidatura não encontrada'), { status: 404 });
  }

  // Transação: confirmar candidatura, rejeitar demais, atualizar plantão
  await prisma.$transaction([
    prisma.candidaturas.update({
      where: { id: Number(candidaturaId) },
      data: { status: 'ACEITA', respondidoEm: new Date() },
    }),
    prisma.candidaturas.updateMany({
      where: { plantaoId: Number(plantaoId), id: { not: Number(candidaturaId) }, status: 'PENDENTE' },
      data: { status: 'REJEITADA', respondidoEm: new Date() },
    }),
    prisma.plantoes.update({
      where: { id: Number(plantaoId) },
      data: { status: 'CONFIRMADO', medicoId: candidatura.medicoId, valorFinal: plantao.valorBase },
    }),
  ]);

  // Notify confirmed doctor
  const medicoUserId = (await prisma.usuarios.findFirst({ where: { medico: { id: candidatura.medicoId } } }))?.id;
  if (medicoUserId) {
    sendToUser(medicoUserId, { type: 'plantao_confirmado', plantaoId: plantao.id });
  }

  return prisma.plantoes.findUnique({ where: { id: Number(plantaoId) }, include: { medico: { include: { usuario: { select: { nomeCompleto: true } } } }, hospital: true } });
}

async function marcarRealizado(plantaoId, userId) {
  const hospital = await prisma.hospitais.findFirst({ where: { usuarioId: userId } });
  const plantao = await prisma.plantoes.findUnique({ where: { id: Number(plantaoId) } });

  if (!plantao) throw Object.assign(new Error('Plantão não encontrado'), { status: 404 });
  if (plantao.hospitalId !== hospital.id) throw Object.assign(new Error('Acesso negado'), { status: 403 });
  validateTransition(plantao.status, 'REALIZADO');

  const taxa = Number(process.env.TAXA_PLATAFORMA || '0.15');
  const valorBruto = Number(plantao.valorFinal || plantao.valorBase);
  const valorTaxaPlat = valorBruto * taxa;
  const valorLiquido = valorBruto - valorTaxaPlat;

  await prisma.$transaction([
    prisma.plantoes.update({
      where: { id: Number(plantaoId) },
      data: { status: 'REALIZADO', realizadoEm: new Date() },
    }),
    prisma.transacoes.upsert({
      where: { plantaoId: Number(plantaoId) },
      create: {
        plantaoId: Number(plantaoId),
        medicoId: plantao.medicoId,
        hospitalId: plantao.hospitalId,
        valorBruto,
        valorTaxaPlat,
        valorLiquido,
      },
      update: { valorBruto, valorTaxaPlat, valorLiquido },
    }),
  ]);

  return prisma.plantoes.findUnique({ where: { id: Number(plantaoId) } });
}

async function cancelarPlantao(plantaoId, userId, role) {
  const plantao = await prisma.plantoes.findUnique({
    where: { id: Number(plantaoId) },
    include: { candidaturas: { where: { status: { in: ['PENDENTE', 'ACEITA'] } }, include: { medico: { include: { usuario: true } } } } },
  });

  if (!plantao) throw Object.assign(new Error('Plantão não encontrado'), { status: 404 });

  // ADMIN can cancel any; HOSPITAL can only cancel their own
  if (role === 'HOSPITAL') {
    const hospital = await prisma.hospitais.findFirst({ where: { usuarioId: userId } });
    if (plantao.hospitalId !== hospital.id) throw Object.assign(new Error('Acesso negado'), { status: 403 });
  } else if (role !== 'ADMIN') {
    throw Object.assign(new Error('Acesso negado'), { status: 403 });
  }

  validateTransition(plantao.status, 'CANCELADO');

  await prisma.$transaction([
    prisma.plantoes.update({ where: { id: Number(plantaoId) }, data: { status: 'CANCELADO' } }),
    prisma.candidaturas.updateMany({
      where: { plantaoId: Number(plantaoId), status: { in: ['PENDENTE', 'ACEITA'] } },
      data: { status: 'CANCELADA' },
    }),
  ]);

  // Notify affected doctors
  for (const cand of plantao.candidaturas) {
    const medicoUserId = cand.medico.usuario.id;
    sendToUser(medicoUserId, { type: 'plantao_cancelado', plantaoId: plantao.id });
  }

  return { success: true };
}

async function notificarMedicosProximos(plantaoId, raioKm = 20) {
  const plantao = await prisma.plantoes.findUnique({
    where: { id: plantaoId },
    include: { especialidade: true },
  });
  if (!plantao || !plantao.latitude) return;

  // Find nearby active doctors with matching specialty
  const medicos = await prisma.medicos.findMany({
    where: {
      crmStatus: 'ATIVO',
      latitude: { not: null },
      especialidades: { some: { especialidadeId: plantao.especialidadeId, ...(plantao.exigeRQE && { rqeValidado: true }) } },
      candidaturas: { none: { plantaoId } },
    },
    include: { usuario: { select: { id: true, pushToken: true } } },
  });

  const proximos = medicos.filter(m =>
    m.latitude && haversineKm(plantao.latitude, plantao.longitude, m.latitude, m.longitude) <= raioKm
  );

  const pushTokens = proximos.map(m => m.usuario.pushToken).filter(Boolean);
  if (pushTokens.length === 0) return;

  // Send Expo push notifications in batches of 100
  const { notificarGrupo } = require('../notificacoes/notificacoes.service');
  const userIds = proximos.map(m => m.usuario.id);
  await notificarGrupo(userIds,
    `🏥 Plantão disponível - ${plantao.especialidade.nome}`,
    `Valor: R$ ${Number(plantao.valorBase).toFixed(2)} • ${plantao.urgente ? '⚡ URGENTE' : ''}`,
    'plantao_novo',
    { plantaoId }
  );

  logger.info(`[plantoes] Notificados ${proximos.length} médicos no raio de ${raioKm}km`);
}

async function getMeusPlantoes(userId, query = {}) {
  const hospital = await prisma.hospitais.findFirst({ where: { usuarioId: userId } });
  if (!hospital) throw Object.assign(new Error('Hospital não encontrado'), { status: 404 });

  const where = { hospitalId: hospital.id };
  if (query.status) where.status = query.status;
  const limit = query.limit ? Math.min(Number(query.limit), 200) : undefined;

  return prisma.plantoes.findMany({
    where,
    include: {
      especialidade: true,
      medico: { include: { usuario: { select: { nomeCompleto: true } } } },
      _count: { select: { candidaturas: true } },
    },
    orderBy: { dataInicio: 'desc' },
    ...(limit ? { take: limit } : {}),
  });
}

module.exports = {
  listarDisponiveis, getById, criarPlantao, confirmarCandidatura,
  marcarRealizado, cancelarPlantao, notificarMedicosProximos, getMeusPlantoes,
};
