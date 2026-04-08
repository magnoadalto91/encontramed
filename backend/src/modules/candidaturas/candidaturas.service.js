'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendToUser } = require('../../config/websocket');

async function candidatar(plantaoId, userId, mensagem) {
  const medico = await prisma.medicos.findFirst({ where: { usuarioId: userId } });
  if (!medico) throw Object.assign(new Error('Perfil de médico não encontrado'), { status: 404 });

  const plantao = await prisma.plantoes.findUnique({
    where: { id: Number(plantaoId) },
    include: { hospital: { include: { usuario: true } } },
  });
  if (!plantao) throw Object.assign(new Error('Plantão não encontrado'), { status: 404 });
  if (!['ABERTO', 'CANDIDATADO'].includes(plantao.status)) {
    throw Object.assign(new Error('Plantão não está disponível para candidatura'), { status: 409 });
  }

  // ─── RQE Gate — Critical Business Rule ────────────────────────────────────
  if (plantao.exigeRQE) {
    const rqe = await prisma.medico_especialidades.findFirst({
      where: { medicoId: medico.id, especialidadeId: plantao.especialidadeId, rqeValidado: true },
    });
    if (!rqe) {
      throw Object.assign(
        new Error('Você não possui RQE validado para a especialidade exigida neste plantão'),
        { status: 403 }
      );
    }
  } else {
    // Without RQE requirement — still needs the specialty listed
    const esp = await prisma.medico_especialidades.findFirst({
      where: { medicoId: medico.id, especialidadeId: plantao.especialidadeId },
    });
    if (!esp) {
      throw Object.assign(
        new Error('Você não possui a especialidade exigida neste plantão'),
        { status: 403 }
      );
    }
  }

  const candidatura = await prisma.candidaturas.create({
    data: { plantaoId: Number(plantaoId), medicoId: medico.id, mensagem },
  });

  // Transition plantao to CANDIDATADO if it was ABERTO
  if (plantao.status === 'ABERTO') {
    await prisma.plantoes.update({ where: { id: plantao.id }, data: { status: 'CANDIDATADO' } });
  }

  // Notify hospital
  const hospitalUserId = plantao.hospital.usuario.id;
  sendToUser(hospitalUserId, {
    type: 'candidatura_nova',
    plantaoId: plantao.id,
    candidaturaId: candidatura.id,
  });

  return candidatura;
}

async function cancelarCandidatura(candidaturaId, userId) {
  const medico = await prisma.medicos.findFirst({ where: { usuarioId: userId } });
  const candidatura = await prisma.candidaturas.findUnique({ where: { id: Number(candidaturaId) } });
  if (!candidatura) throw Object.assign(new Error('Candidatura não encontrada'), { status: 404 });
  if (candidatura.medicoId !== medico.id) throw Object.assign(new Error('Acesso negado'), { status: 403 });
  if (candidatura.status !== 'PENDENTE') throw Object.assign(new Error('Apenas candidaturas pendentes podem ser canceladas'), { status: 409 });

  return prisma.candidaturas.update({
    where: { id: Number(candidaturaId) },
    data: { status: 'CANCELADA' },
  });
}

async function aceitar(candidaturaId, userId) {
  const hospital = await prisma.hospitais.findFirst({ where: { usuarioId: userId } });
  const candidatura = await prisma.candidaturas.findUnique({
    where: { id: Number(candidaturaId) },
    include: { plantao: true, medico: { include: { usuario: true } } },
  });
  if (!candidatura) throw Object.assign(new Error('Candidatura não encontrada'), { status: 404 });
  if (candidatura.plantao.hospitalId !== hospital.id) throw Object.assign(new Error('Acesso negado'), { status: 403 });

  // Delegate to plantoes.service for full confirmation logic
  const plantaoSvc = require('../plantoes/plantoes.service');
  return plantaoSvc.confirmarCandidatura(candidatura.plantaoId, candidaturaId, userId);
}

async function rejeitar(candidaturaId, userId, motivoRejeicao) {
  const hospital = await prisma.hospitais.findFirst({ where: { usuarioId: userId } });
  const candidatura = await prisma.candidaturas.findUnique({
    where: { id: Number(candidaturaId) },
    include: { plantao: true, medico: { include: { usuario: true } } },
  });
  if (!candidatura) throw Object.assign(new Error('Candidatura não encontrada'), { status: 404 });
  if (candidatura.plantao.hospitalId !== hospital.id) throw Object.assign(new Error('Acesso negado'), { status: 403 });

  await prisma.candidaturas.update({
    where: { id: Number(candidaturaId) },
    data: { status: 'REJEITADA', respondidoEm: new Date() },
  });

  sendToUser(candidatura.medico.usuario.id, {
    type: 'candidatura_respondida',
    status: 'REJEITADA',
    plantaoId: candidatura.plantaoId,
    candidaturaId: Number(candidaturaId),
  });

  return { success: true };
}

module.exports = { candidatar, cancelarCandidatura, aceitar, rejeitar };
