'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crmScraper = require('../medicos/crm.scraper');
const logger = require('../../utils/logger');

async function getStats() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);

  const [
    totalMedicos, totalHospitais, plantoesAtivos,
    realizadosHoje, docsPendentes, chamadosAbertos,
    receitaMes,
  ] = await Promise.all([
    prisma.medicos.count(),
    prisma.hospitais.count(),
    prisma.plantoes.count({ where: { status: { in: ['ABERTO', 'CANDIDATADO', 'CONFIRMADO'] } } }),
    prisma.plantoes.count({ where: { status: 'REALIZADO', realizadoEm: { gte: hoje, lt: amanha } } }),
    prisma.documentos.count({ where: { status: 'PENDENTE' } }),
    prisma.chamados.count({ where: { status: 'ABERTO' } }),
    prisma.transacoes.aggregate({
      where: { criadoEm: { gte: new Date(hoje.getFullYear(), hoje.getMonth(), 1) } },
      _sum: { valorTaxaPlat: true },
    }),
  ]);

  const plantoesPorStatus = await prisma.plantoes.groupBy({
    by: ['status'],
    _count: { status: true },
  });

  return {
    totalMedicos, totalHospitais, plantoesAtivos, realizadosHoje,
    docsPendentes, chamadosAbertos,
    receitaMes: Number(receitaMes._sum.valorTaxaPlat || 0),
    plantoesPorStatus: Object.fromEntries(plantoesPorStatus.map(p => [p.status, p._count.status])),
  };
}

async function listarUsuarios(filters = {}) {
  const { role, search, page = 1, limit = 20 } = filters;
  const skip = (Number(page) - 1) * Number(limit);

  const where = {};
  if (role) where.role = role;
  if (search) where.OR = [
    { nomeCompleto: { contains: search, mode: 'insensitive' } },
    { email: { contains: search, mode: 'insensitive' } },
  ];

  const [usuarios, total] = await Promise.all([
    prisma.usuarios.findMany({
      where, skip, take: Number(limit),
      select: {
        id: true, email: true, nomeCompleto: true, role: true,
        ativo: true, emailVerificado: true, criadoEm: true,
        medico: { select: { crm: true, crmUf: true, crmStatus: true } },
        hospital: { select: { cnpj: true, razaoSocial: true, verificado: true } },
      },
      orderBy: { criadoEm: 'desc' },
    }),
    prisma.usuarios.count({ where }),
  ]);

  return { usuarios, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
}

async function ativarUsuario(id) {
  return prisma.usuarios.update({ where: { id: Number(id) }, data: { ativo: true } });
}

async function suspenderUsuario(id) {
  await prisma.sessoes.updateMany({ where: { userId: Number(id), ativo: true }, data: { ativo: false, fim: new Date() } });
  return prisma.usuarios.update({ where: { id: Number(id) }, data: { ativo: false } });
}

async function verificarHospital(hospitalId) {
  return prisma.hospitais.update({ where: { id: Number(hospitalId) }, data: { verificado: true } });
}

async function revalidarCRM(medicoId) {
  const medico = await prisma.medicos.findUnique({ where: { id: Number(medicoId) } });
  if (!medico?.crm || !medico?.crmUf) throw Object.assign(new Error('Médico sem CRM cadastrado'), { status: 400 });

  const resultado = await crmScraper.validarCRM(medico.crm, medico.crmUf);

  await prisma.medicos.update({
    where: { id: Number(medicoId) },
    data: { crmStatus: resultado.status, crmUltimaVerif: new Date() },
  });

  return { ...resultado, medicoId };
}

async function getConfig() {
  const configs = await prisma.configuracoes.findMany({ orderBy: { chave: 'asc' } });
  return Object.fromEntries(configs.map(c => [c.chave, c.valor]));
}

async function setConfig(chave, valor, descricao) {
  return prisma.configuracoes.upsert({
    where: { chave },
    create: { chave, valor, descricao },
    update: { valor, ...(descricao && { descricao }) },
  });
}

async function listarChamados(filters = {}) {
  const { status, prioridade, suporteId, page = 1, limit = 20 } = filters;
  const skip = (Number(page) - 1) * Number(limit);
  const where = {};
  if (status) where.status = status;
  if (prioridade) where.prioridade = prioridade;
  if (suporteId) where.suporteId = Number(suporteId);

  const [chamados, total] = await Promise.all([
    prisma.chamados.findMany({
      where, skip, take: Number(limit),
      include: {
        usuario: { select: { nomeCompleto: true, email: true, role: true } },
        suporte: { select: { nomeCompleto: true } },
        _count: { select: { mensagens: true } },
      },
      orderBy: [{ prioridade: 'desc' }, { criadoEm: 'desc' }],
    }),
    prisma.chamados.count({ where }),
  ]);

  return { chamados, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
}

async function getChamado(id) {
  return prisma.chamados.findUnique({
    where: { id: Number(id) },
    include: {
      usuario: { select: { nomeCompleto: true, email: true, role: true } },
      suporte: { select: { nomeCompleto: true } },
      mensagens: {
        include: { autor: { select: { nomeCompleto: true, role: true } } },
        orderBy: { criadoEm: 'asc' },
      },
    },
  });
}

async function responderChamado(chamadoId, autorId, texto, resolver = false) {
  const updates = [
    prisma.chamado_mensagens.create({ data: { chamadoId: Number(chamadoId), autorId, texto } }),
  ];
  if (resolver) {
    updates.push(prisma.chamados.update({
      where: { id: Number(chamadoId) },
      data: { status: 'RESOLVIDO', resolvidoEm: new Date() },
    }));
  } else {
    updates.push(prisma.chamados.update({
      where: { id: Number(chamadoId) },
      data: { status: 'EM_ANDAMENTO', suporteId: autorId },
    }));
  }
  await prisma.$transaction(updates);
  return { success: true };
}

module.exports = {
  getStats, listarUsuarios, ativarUsuario, suspenderUsuario,
  verificarHospital, revalidarCRM, getConfig, setConfig,
  listarChamados, getChamado, responderChamado,
};
