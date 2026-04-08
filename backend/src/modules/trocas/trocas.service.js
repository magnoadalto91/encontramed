'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendToUser } = require('../../config/websocket');

async function solicitarTroca(data, userId) {
  const medico = await prisma.medicos.findFirst({ where: { usuarioId: userId } });
  const { plantaoOrigemId, plantaoDestinoId, tipo, valorCompensacao, mensagem } = data;

  const plantaoOrigem = await prisma.plantoes.findUnique({
    where: { id: Number(plantaoOrigemId) },
    include: { hospital: { include: { usuario: true } } },
  });

  if (!plantaoOrigem) throw Object.assign(new Error('Plantão não encontrado'), { status: 404 });
  if (plantaoOrigem.medicoId !== medico.id) throw Object.assign(new Error('Você não está confirmado neste plantão'), { status: 403 });
  if (plantaoOrigem.status !== 'CONFIRMADO') throw Object.assign(new Error('Apenas plantões confirmados podem ser trocados'), { status: 409 });

  let destinatarioId = null;
  if (plantaoDestinoId) {
    const plantaoDestino = await prisma.plantoes.findUnique({ where: { id: Number(plantaoDestinoId) } });
    if (plantaoDestino?.medicoId) destinatarioId = plantaoDestino.medicoId;
  }

  const troca = await prisma.trocas.create({
    data: {
      plantaoOrigemId: Number(plantaoOrigemId),
      plantaoDestinoId: plantaoDestinoId ? Number(plantaoDestinoId) : null,
      solicitanteId: medico.id,
      destinatarioId,
      hospitalId: plantaoOrigem.hospitalId,
      tipo: tipo || 'TROCA',
      valorCompensacao: valorCompensacao ? Number(valorCompensacao) : null,
      mensagem,
    },
  });

  // Notify hospital and destinatário if known
  sendToUser(plantaoOrigem.hospital.usuario.id, { type: 'troca_solicitada', trocaId: troca.id });
  if (destinatarioId) {
    const destUsr = await prisma.usuarios.findFirst({ where: { medico: { id: destinatarioId } } });
    if (destUsr) sendToUser(destUsr.id, { type: 'troca_solicitada', trocaId: troca.id });
  }

  return troca;
}

async function aprovarHospital(trocaId, userId) {
  const hospital = await prisma.hospitais.findFirst({ where: { usuarioId: userId } });
  const troca = await prisma.trocas.findUnique({
    where: { id: Number(trocaId) },
    include: { plantaoOrigem: true, plantaoDestino: true },
  });

  if (!troca) throw Object.assign(new Error('Troca não encontrada'), { status: 404 });
  if (troca.hospitalId !== hospital.id) throw Object.assign(new Error('Acesso negado'), { status: 403 });

  // Swap medicoIds between plantoes
  await prisma.$transaction([
    prisma.trocas.update({
      where: { id: Number(trocaId) },
      data: { status: 'APROVADA', aprovadoPorHospital: true, resolvidoEm: new Date() },
    }),
    troca.plantaoDestinoId && prisma.plantoes.update({
      where: { id: troca.plantaoOrigemId },
      data: { medicoId: troca.plantaoDestino?.medicoId },
    }),
    troca.plantaoDestinoId && prisma.plantoes.update({
      where: { id: troca.plantaoDestinoId },
      data: { medicoId: troca.plantaoOrigem.medicoId },
    }),
  ].filter(Boolean));

  return { success: true };
}

async function rejeitarHospital(trocaId, userId, motivoRejeicao) {
  const hospital = await prisma.hospitais.findFirst({ where: { usuarioId: userId } });
  const troca = await prisma.trocas.findUnique({ where: { id: Number(trocaId) } });
  if (!troca || troca.hospitalId !== hospital.id) throw Object.assign(new Error('Acesso negado'), { status: 403 });

  return prisma.trocas.update({
    where: { id: Number(trocaId) },
    data: { status: 'REJEITADA', motivoRejeicao, resolvidoEm: new Date() },
  });
}

async function listarPorHospital(userId) {
  const hospital = await prisma.hospitais.findFirst({ where: { usuarioId: userId } });
  return prisma.trocas.findMany({
    where: { hospitalId: hospital.id, status: 'PENDENTE' },
    include: {
      plantaoOrigem: { include: { especialidade: true } },
      plantaoDestino: { include: { especialidade: true } },
      solicitante: { include: { usuario: { select: { nomeCompleto: true } } } },
      destinatario: { include: { usuario: { select: { nomeCompleto: true } } } },
    },
    orderBy: { criadoEm: 'desc' },
  });
}

async function listarEnviadas(userId) {
  const medico = await prisma.medicos.findFirst({ where: { usuarioId: userId } });
  return prisma.trocas.findMany({
    where: { solicitanteId: medico.id },
    include: { plantaoOrigem: { include: { especialidade: true, hospital: true } } },
    orderBy: { criadoEm: 'desc' },
  });
}

async function listarRecebidas(userId) {
  const medico = await prisma.medicos.findFirst({ where: { usuarioId: userId } });
  return prisma.trocas.findMany({
    where: { destinatarioId: medico.id, status: 'PENDENTE' },
    include: {
      plantaoOrigem: { include: { especialidade: true, hospital: true } },
      solicitante: { include: { usuario: { select: { nomeCompleto: true } } } },
    },
    orderBy: { criadoEm: 'desc' },
  });
}

module.exports = { solicitarTroca, aprovarHospital, rejeitarHospital, listarPorHospital, listarEnviadas, listarRecebidas };
