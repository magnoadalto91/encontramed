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

  const allowedFields = [
    'razaoSocial', 'nomeFantasia', 'codigoCNES', 'tipoEstabelecimento',
    'enderecoLogradouro', 'enderecoNumero', 'enderecoBairro', 'enderecoCidade',
    'enderecoEstado', 'enderecoCep', 'latitude', 'longitude',
    'descricao', 'responsavelNome', 'responsavelCRM', 'telefoneContato',
    'cnesDados', 'cnesUltimaConsulta',
  ];

  const filtrado = {};
  for (const key of allowedFields) {
    if (data[key] !== undefined) filtrado[key] = data[key];
  }

  return prisma.hospitais.update({ where: { id: hospital.id }, data: filtrado });
}

async function buscarCNPJ(cnpj) {
  return cnesService.buscarPorCNPJ(cnpj);
}

/**
 * Busca dados CNES pelo CNPJ e persiste no perfil do hospital.
 */
async function vincularCNES(userId, cnpj) {
  const dados = await cnesService.buscarPorCNPJ(cnpj.replace(/\D/g, ''));
  if (!dados) throw Object.assign(new Error('Nenhum dado encontrado para este CNPJ'), { status: 404 });

  const hospital = await prisma.hospitais.findFirst({ where: { usuarioId: userId } });
  if (!hospital) throw Object.assign(new Error('Hospital não encontrado'), { status: 404 });

  await prisma.hospitais.update({
    where: { id: hospital.id },
    data: {
      razaoSocial:        dados.razaoSocial        || hospital.razaoSocial,
      nomeFantasia:       dados.nomeFantasia        || hospital.nomeFantasia,
      codigoCNES:         dados.codigoCNES          || hospital.codigoCNES,
      tipoEstabelecimento: dados.tipoEstabelecimento || hospital.tipoEstabelecimento,
      enderecoLogradouro: dados.enderecoLogradouro  || hospital.enderecoLogradouro,
      enderecoNumero:     dados.enderecoNumero      || hospital.enderecoNumero,
      enderecoBairro:     dados.enderecoBairro      || hospital.enderecoBairro,
      enderecoCidade:     dados.enderecoCidade      || hospital.enderecoCidade,
      enderecoEstado:     dados.enderecoEstado      || hospital.enderecoEstado,
      enderecoCep:        dados.enderecoCep         || hospital.enderecoCep,
      telefoneContato:    dados.telefoneContato     || hospital.telefoneContato,
      latitude:           dados.latitude            ?? hospital.latitude,
      longitude:          dados.longitude           ?? hospital.longitude,
      cnesDados:          dados,
      cnesUltimaConsulta: new Date(),
    },
  });

  return dados;
}

async function getDashboardStats(userId) {
  const hospital = await prisma.hospitais.findFirst({ where: { usuarioId: userId } });
  if (!hospital) throw Object.assign(new Error('Hospital não encontrado'), { status: 404 });

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);

  const [ativos, candidatosPendentes, realizadosHoje] = await Promise.all([
    prisma.plantoes.count({ where: { hospitalId: hospital.id, status: { in: ['ABERTO', 'CANDIDATADO', 'CONFIRMADO'] } } }),
    prisma.candidaturas.count({ where: { status: 'PENDENTE', plantao: { hospitalId: hospital.id } } }),
    prisma.plantoes.count({ where: { hospitalId: hospital.id, status: 'REALIZADO', realizadoEm: { gte: hoje, lt: amanha } } }),
  ]);

  return { plantoesAtivos: ativos, candidatosPendentes, realizadosHoje };
}

module.exports = { getPerfil, updatePerfil, buscarCNPJ, vincularCNES, getDashboardStats };
