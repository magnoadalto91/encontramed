'use strict';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getWalletMedico(userId) {
  const medico = await prisma.medicos.findFirst({ where: { usuarioId: userId } });
  if (!medico) throw Object.assign(new Error('Médico não encontrado'), { status: 404 });

  const [transacoes, plantoesFuturos, stats] = await Promise.all([
    // Payment history
    prisma.transacoes.findMany({
      where: { medicoId: medico.id },
      include: { plantao: { select: { titulo: true, dataInicio: true, localCidade: true } } },
      orderBy: { criadoEm: 'desc' },
      take: 50,
    }),
    // Upcoming confirmed plantoes
    prisma.plantoes.findMany({
      where: {
        medicoId: medico.id,
        status: 'CONFIRMADO',
        dataInicio: { gte: new Date() },
      },
      include: { hospital: { select: { nomeFantasia: true, razaoSocial: true } } },
      orderBy: { dataInicio: 'asc' },
    }),
    // Aggregate stats
    prisma.transacoes.aggregate({
      where: { medicoId: medico.id, pagoEm: { not: null } },
      _sum: { valorLiquido: true },
      _count: { id: true },
    }),
  ]);

  // Pending amount (confirmed plantoes not yet paid)
  const pendente = await prisma.plantoes.aggregate({
    where: { medicoId: medico.id, status: { in: ['CONFIRMADO', 'REALIZADO'] } },
    _sum: { valorBase: true },
  });

  return {
    totalRecebido: stats._sum.valorLiquido || 0,
    totalPlantoes: stats._count.id,
    valorPendente: pendente._sum.valorBase || 0,
    plantoesFuturos,
    historico: transacoes,
    notaMedia: medico.notaMedia,
    totalAvaliacoes: medico.totalAvaliacoes,
  };
}

module.exports = { getWalletMedico };
