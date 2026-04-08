'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const cnesService = require('./cnes.service');

async function getPerfil(userId) {
  const hospital = await prisma.hospitais.findFirst({
    where: { usuarioId: userId },
    include: { usuario: { select: { email: true, nomeCompleto: true, telefone: true } } },
  });
  if (!hospital) throw Object.assign(new Error('Hospital não encontrado'), { status: 404 });
  return hospital;
}

async function updatePerfil(userId, data) {
  const hospital = await prisma.hospitais.findFirst({ where: { usuarioId: userId } });
  if (!hospital) throw Object.assign(new Error('Hospital não encontrado'), { status: 404 });

  const allowedFields = ['razaoSocial', 'nomeFantasia', 'cnpj', 'codigoCNES', 'tipoEstabelecimento',
    'enderecoLogradouro', 'enderecoNumero', 'enderecoBairro', 'enderecoCidade', 'enderecoEstado',
    'enderecoCep', 'latitude', 'longitude', 'descricao', 'responsavelNome', 'responsavelCRM', 'telefoneContato'];

  const filtrado = {};
  for (const key of allowedFields) {
    if (data[key] !== undefined) filtrado[key] = data[key];
  }

  return prisma.hospitais.update({ where: { id: hospital.id }, data: filtrado });
}

async function buscarCNPJ(cnpj) {
  return cnesService.buscarPorCNPJ(cnpj);
}

async function getDashboardStats(userId) {
  const hospital = await prisma.hospitais.findFirst({ where: { usuarioId: userId } });
  if (!hospital) throw Object.assign(new Error('Hospital não encontrado'), { status: 404 });

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);

  const [ativos, candidatosPendentes, realizadosHoje, transacoesMes] = await Promise.all([
    prisma.plantoes.count({ where: { hospitalId: hospital.id, status: { in: ['ABERTO', 'CANDIDATADO', 'CONFIRMADO'] } } }),
    prisma.candidaturas.count({
      where: { status: 'PENDENTE', plantao: { hospitalId: hospital.id } },
    }),
    prisma.plantoes.count({
      where: { hospitalId: hospital.id, status: 'REALIZADO', realizadoEm: { gte: hoje, lt: amanha } },
    }),
    prisma.transacoes.aggregate({
      where: {
        hospitalId: hospital.id,
        criadoEm: { gte: new Date(hoje.getFullYear(), hoje.getMonth(), 1) },
      },
      _sum: { valorBruto: true },
    }),
  ]);

  return {
    plantoesAtivos: ativos,
    candidatosPendentes,
    realizadosHoje,
    faturamentoMes: Number(transacoesMes._sum.valorBruto || 0),
  };
}

module.exports = { getPerfil, updatePerfil, buscarCNPJ, getDashboardStats };
