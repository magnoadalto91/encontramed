'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const nfeService = require('./nfe.service');

async function getExtrato(userId, mes, ano) {
  const medico = await prisma.medicos.findFirst({ where: { usuarioId: userId } });
  if (!medico) throw Object.assign(new Error('Médico não encontrado'), { status: 404 });

  const where = { medicoId: medico.id };
  if (mes && ano) {
    where.criadoEm = {
      gte: new Date(ano, mes - 1, 1),
      lte: new Date(ano, mes, 0, 23, 59, 59),
    };
  }

  const transacoes = await prisma.transacoes.findMany({
    where,
    orderBy: { criadoEm: 'desc' },
    include: {
      plantao: { select: { dataInicio: true, dataFim: true, hospital: { select: { razaoSocial: true, nomeFantasia: true } } } },
    },
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

async function getExtratoHospital(userId, mes, ano) {
  const hospital = await prisma.hospitais.findFirst({ where: { usuarioId: userId } });
  if (!hospital) throw Object.assign(new Error('Hospital não encontrado'), { status: 404 });

  const where = { hospitalId: hospital.id };
  if (mes && ano) {
    where.criadoEm = {
      gte: new Date(ano, mes - 1, 1),
      lte: new Date(ano, mes, 0, 23, 59, 59),
    };
  }

  const transacoes = await prisma.transacoes.findMany({
    where, orderBy: { criadoEm: 'desc' },
    include: {
      medico: { include: { usuario: { select: { nomeCompleto: true } } } },
      plantao: { select: { dataInicio: true, dataFim: true, especialidade: true } },
    },
  });

  const totais = transacoes.reduce((acc, t) => {
    acc.totalBruto += Number(t.valorBruto);
    if (t.pagoEm) acc.pago += Number(t.valorBruto);
    else acc.pendente += Number(t.valorBruto);
    return acc;
  }, { totalBruto: 0, pago: 0, pendente: 0 });

  return { transacoes, totais };
}

async function confirmarPagamento(transacaoId, adminUserId) {
  const transacao = await prisma.transacoes.findUnique({
    where: { id: Number(transacaoId) },
  });
  if (!transacao) throw Object.assign(new Error('Transação não encontrada'), { status: 404 });
  if (transacao.pagoEm) throw Object.assign(new Error('Pagamento já confirmado'), { status: 409 });

  await prisma.$transaction([
    prisma.transacoes.update({
      where: { id: Number(transacaoId) },
      data: { pagoEm: new Date(), metodoPagamento: 'manual' },
    }),
    transacao.plantaoId && prisma.plantoes.update({
      where: { id: transacao.plantaoId },
      data: { status: 'PAGO', pagoEm: new Date() },
    }),
  ].filter(Boolean));

  return { success: true };
}

async function prepararNFe(transacaoId, userId) {
  const transacao = await prisma.transacoes.findUnique({
    where: { id: Number(transacaoId) },
    include: {
      medico: true,
      hospital: true,
      plantao: { select: { dataInicio: true } },
    },
  });
  if (!transacao) throw Object.assign(new Error('Transação não encontrada'), { status: 404 });

  return nfeService.prepararNFe(transacao);
}

async function emitirNFe(transacaoId, userId) {
  const transacao = await prisma.transacoes.findUnique({
    where: { id: Number(transacaoId) },
    include: { medico: true, hospital: true, plantao: { select: { dataInicio: true } } },
  });
  if (!transacao) throw Object.assign(new Error('Transação não encontrada'), { status: 404 });

  const nfeData = await nfeService.prepararNFe(transacao);
  const resultado = await nfeService.emitirNFe(transacaoId, nfeData);

  await prisma.transacoes.update({
    where: { id: Number(transacaoId) },
    data: {
      nfeStatus: 'EMITIDA',
      nfeNumero: resultado.numero,
      nfeSerie: resultado.serie,
      nfeEmitidaEm: new Date(),
      nfeJson: resultado,
    },
  });

  return resultado;
}

module.exports = { getExtrato, getExtratoHospital, confirmarPagamento, prepararNFe, emitirNFe };
