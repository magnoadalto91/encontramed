'use strict';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function criarAvaliacao(plantaoId, userId, { nota, comentario }) {
  if (!nota || nota < 1 || nota > 5) throw Object.assign(new Error('Nota deve ser entre 1 e 5'), { status: 400 });

  const plantao = await prisma.plantoes.findUnique({
    where: { id: Number(plantaoId) },
    include: {
      hospital: { select: { id: true, usuarioId: true } },
      medico: { select: { id: true, usuarioId: true } },
    },
  });
  if (!plantao) throw Object.assign(new Error('Plantão não encontrado'), { status: 404 });
  if (plantao.status !== 'REALIZADO' && plantao.status !== 'PAGO') {
    throw Object.assign(new Error('Avaliação só disponível após o plantão ser realizado'), { status: 409 });
  }

  const isHospital = plantao.hospital.usuarioId === userId;
  const isMedico = plantao.medico?.usuarioId === userId;
  if (!isHospital && !isMedico) throw Object.assign(new Error('Sem permissão'), { status: 403 });

  const tipo = isHospital ? 'HOSPITAL_AVALIA_MEDICO' : 'MEDICO_AVALIA_HOSPITAL';

  const avaliacao = await prisma.avaliacoes.create({
    data: {
      plantaoId: Number(plantaoId),
      avaliadorId: userId,
      tipo,
      medicoId: isHospital ? plantao.medico?.id : null,
      hospitalId: isMedico ? plantao.hospital.id : null,
      nota: Number(nota),
      comentario: comentario?.trim() || null,
    },
  });

  // Update average rating on the rated entity
  if (isHospital && plantao.medico) {
    const agg = await prisma.avaliacoes.aggregate({
      where: { medicoId: plantao.medico.id, tipo: 'HOSPITAL_AVALIA_MEDICO' },
      _avg: { nota: true },
      _count: { nota: true },
    });
    await prisma.medicos.update({
      where: { id: plantao.medico.id },
      data: { notaMedia: agg._avg.nota, totalAvaliacoes: agg._count.nota },
    });
  } else if (isMedico) {
    const agg = await prisma.avaliacoes.aggregate({
      where: { hospitalId: plantao.hospital.id, tipo: 'MEDICO_AVALIA_HOSPITAL' },
      _avg: { nota: true },
      _count: { nota: true },
    });
    await prisma.hospitais.update({
      where: { id: plantao.hospital.id },
      data: { notaMedia: agg._avg.nota, totalAvaliacoes: agg._count.nota },
    });
  }

  return avaliacao;
}

async function getAvaliacoesMedico(medicoId) {
  return prisma.avaliacoes.findMany({
    where: { medicoId: Number(medicoId), tipo: 'HOSPITAL_AVALIA_MEDICO' },
    include: { plantao: { select: { titulo: true, dataInicio: true } }, avaliador: { select: { nomeCompleto: true } } },
    orderBy: { criadoEm: 'desc' },
  });
}

async function getAvaliacoesHospital(hospitalId) {
  return prisma.avaliacoes.findMany({
    where: { hospitalId: Number(hospitalId), tipo: 'MEDICO_AVALIA_HOSPITAL' },
    include: { plantao: { select: { titulo: true, dataInicio: true } }, avaliador: { select: { nomeCompleto: true } } },
    orderBy: { criadoEm: 'desc' },
  });
}

async function getMeusPendentes(userId) {
  // Find plantoes the user was involved in (REALIZADO or PAGO) that they haven't rated yet
  const user = await prisma.usuarios.findUnique({ where: { id: userId }, select: { role: true } });

  if (user.role === 'MEDICO') {
    const medico = await prisma.medicos.findFirst({ where: { usuarioId: userId } });
    if (!medico) return [];
    return prisma.plantoes.findMany({
      where: {
        medicoId: medico.id,
        status: { in: ['REALIZADO', 'PAGO'] },
        avaliacoes: { none: { avaliadorId: userId } },
      },
      select: { id: true, titulo: true, dataInicio: true, hospital: { select: { nomeFantasia: true, razaoSocial: true } } },
    });
  } else if (user.role === 'HOSPITAL') {
    const hospital = await prisma.hospitais.findFirst({ where: { usuarioId: userId } });
    if (!hospital) return [];
    return prisma.plantoes.findMany({
      where: {
        hospitalId: hospital.id,
        status: { in: ['REALIZADO', 'PAGO'] },
        medicoId: { not: null },
        avaliacoes: { none: { avaliadorId: userId } },
      },
      select: { id: true, titulo: true, dataInicio: true, medico: { include: { usuario: { select: { nomeCompleto: true } } } } },
    });
  }
  return [];
}

module.exports = { criarAvaliacao, getAvaliacoesMedico, getAvaliacoesHospital, getMeusPendentes };
