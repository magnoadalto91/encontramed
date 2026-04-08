'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getPerfil(userId) {
  const medico = await prisma.medicos.findFirst({
    where: { usuarioId: userId },
    include: {
      usuario: { select: { email: true, nomeCompleto: true, telefone: true } },
      especialidades: { include: { especialidade: true } },
      rqes: { include: { especialidade: true } },
    },
  });
  if (!medico) throw Object.assign(new Error('Médico não encontrado'), { status: 404 });
  return medico;
}

async function updatePerfil(userId, data) {
  const medico = await prisma.medicos.findFirst({ where: { usuarioId: userId } });
  if (!medico) throw Object.assign(new Error('Médico não encontrado'), { status: 404 });

  const { nomeCompleto, telefone, ...medicoData } = data;
  const allowedFields = ['cpf', 'dataNascimento', 'crm', 'crmUf', 'enderecoLogradouro',
    'enderecoCidade', 'enderecoEstado', 'enderecoCep', 'cnpj', 'razaoSocial',
    'resumo', 'valorHoraBase'];

  const filtrado = {};
  for (const key of allowedFields) {
    if (medicoData[key] !== undefined) filtrado[key] = medicoData[key];
  }

  await Promise.all([
    prisma.medicos.update({ where: { id: medico.id }, data: filtrado }),
    (nomeCompleto || telefone) && prisma.usuarios.update({
      where: { id: userId },
      data: { ...(nomeCompleto && { nomeCompleto }), ...(telefone && { telefone }) },
    }),
  ]);

  return getPerfil(userId);
}

async function updateLocalizacao(userId, lat, lng) {
  const medico = await prisma.medicos.findFirst({ where: { usuarioId: userId } });
  if (!medico) throw Object.assign(new Error('Médico não encontrado'), { status: 404 });
  return prisma.medicos.update({
    where: { id: medico.id },
    data: { latitude: lat, longitude: lng },
  });
}

async function addEspecialidade(userId, especialidadeId, rqeNumero, principal) {
  const medico = await prisma.medicos.findFirst({ where: { usuarioId: userId } });
  const esp = await prisma.especialidades.findUnique({ where: { id: Number(especialidadeId) } });
  if (!esp) throw Object.assign(new Error('Especialidade não encontrada'), { status: 404 });

  return prisma.medico_especialidades.upsert({
    where: { medicoId_especialidadeId: { medicoId: medico.id, especialidadeId: Number(especialidadeId) } },
    create: { medicoId: medico.id, especialidadeId: Number(especialidadeId), rqeNumero, rqeValidado: false, principal: !!principal },
    update: { rqeNumero, principal: !!principal },
  });
}

async function removeEspecialidade(userId, especialidadeId) {
  const medico = await prisma.medicos.findFirst({ where: { usuarioId: userId } });
  return prisma.medico_especialidades.delete({
    where: { medicoId_especialidadeId: { medicoId: medico.id, especialidadeId: Number(especialidadeId) } },
  });
}

async function getMeusPlantoes(userId, status, page = 1, limit = 20) {
  const medico = await prisma.medicos.findFirst({ where: { usuarioId: userId } });
  const skip = (page - 1) * limit;
  const where = { medicoId: medico.id };
  if (status) where.status = status;

  const [plantoes, total] = await Promise.all([
    prisma.plantoes.findMany({
      where, skip, take: Number(limit),
      include: { hospital: { select: { razaoSocial: true, nomeFantasia: true, enderecoCidade: true } }, especialidade: true },
      orderBy: { dataInicio: 'desc' },
    }),
    prisma.plantoes.count({ where }),
  ]);

  return { plantoes, total, page: Number(page), pages: Math.ceil(total / limit) };
}

async function getCandidaturas(userId, page = 1, limit = 20) {
  const medico = await prisma.medicos.findFirst({ where: { usuarioId: userId } });
  const skip = (page - 1) * limit;
  const [candidaturas, total] = await Promise.all([
    prisma.candidaturas.findMany({
      where: { medicoId: medico.id }, skip, take: Number(limit),
      include: { plantao: { include: { hospital: { select: { razaoSocial: true, nomeFantasia: true } }, especialidade: true } }, bid: true },
      orderBy: { criadoEm: 'desc' },
    }),
    prisma.candidaturas.count({ where: { medicoId: medico.id } }),
  ]);
  return { candidaturas, total, page: Number(page), pages: Math.ceil(total / limit) };
}

async function getFinanceiro(userId, mes, ano) {
  const medico = await prisma.medicos.findFirst({ where: { usuarioId: userId } });
  const where = { medicoId: medico.id };

  if (mes && ano) {
    const dataInicio = new Date(ano, mes - 1, 1);
    const dataFim = new Date(ano, mes, 0, 23, 59, 59);
    where.criadoEm = { gte: dataInicio, lte: dataFim };
  }

  const transacoes = await prisma.transacoes.findMany({
    where, orderBy: { criadoEm: 'desc' },
    include: { plantao: { select: { dataInicio: true, dataFim: true, hospital: { select: { razaoSocial: true, nomeFantasia: true } } } } },
  });

  const totais = transacoes.reduce((acc, t) => {
    acc.bruto += Number(t.valorBruto);
    acc.liquido += Number(t.valorLiquido);
    if (t.pagoEm) acc.recebido += Number(t.valorLiquido);
    else acc.aReceber += Number(t.valorLiquido);
    return acc;
  }, { bruto: 0, liquido: 0, recebido: 0, aReceber: 0 });

  return { transacoes, totais };
}

async function updatePushToken(userId, pushToken) {
  return prisma.usuarios.update({ where: { id: userId }, data: { pushToken } });
}

module.exports = { getPerfil, updatePerfil, updateLocalizacao, addEspecialidade, removeEspecialidade, getMeusPlantoes, getCandidaturas, getFinanceiro, updatePushToken };
