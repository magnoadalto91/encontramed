'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendToUser } = require('../../config/websocket');

async function criarBid(plantaoId, userId, valorProposto, mensagem) {
  const medico = await prisma.medicos.findFirst({ where: { usuarioId: userId } });
  const plantao = await prisma.plantoes.findUnique({
    where: { id: Number(plantaoId) },
    include: { hospital: { include: { usuario: true } } },
  });

  if (!plantao) throw Object.assign(new Error('Plantão não encontrado'), { status: 404 });
  if (!plantao.permiteBid) throw Object.assign(new Error('Este plantão não aceita propostas de valor'), { status: 400 });
  if (plantao.valorMinimoBid && Number(valorProposto) < Number(plantao.valorMinimoBid)) {
    throw Object.assign(new Error(`Valor mínimo para bid: R$ ${Number(plantao.valorMinimoBid).toFixed(2)}`), { status: 400 });
  }

  // Upsert bid (one per medico per plantao)
  const existingBid = await prisma.bids.findFirst({ where: { plantaoId: Number(plantaoId), medicoId: medico.id } });

  let bid;
  if (existingBid) {
    bid = await prisma.bids.update({
      where: { id: existingBid.id },
      data: { valorProposto: Number(valorProposto), valorAnterior: existingBid.valorProposto, mensagem },
    });
  } else {
    // Create candidatura linked to this bid if not exists
    let candidatura = await prisma.candidaturas.findFirst({ where: { plantaoId: Number(plantaoId), medicoId: medico.id } });
    if (!candidatura) {
      candidatura = await prisma.candidaturas.create({
        data: { plantaoId: Number(plantaoId), medicoId: medico.id, status: 'CONTRAPROPOSTA' },
      });
    }
    bid = await prisma.bids.create({
      data: { plantaoId: Number(plantaoId), medicoId: medico.id, candidaturaId: candidatura.id, valorProposto: Number(valorProposto), mensagem },
    });
  }

  // Notify hospital
  sendToUser(plantao.hospital.usuario.id, { type: 'bid_nova', plantaoId: Number(plantaoId), bidId: bid.id, valorProposto });
  return bid;
}

async function aceitarBid(bidId, userId) {
  const hospital = await prisma.hospitais.findFirst({ where: { usuarioId: userId } });
  const bid = await prisma.bids.findUnique({
    where: { id: Number(bidId) },
    include: { plantao: { include: { hospital: true } }, medico: { include: { usuario: true } }, candidatura: true },
  });
  if (!bid) throw Object.assign(new Error('Bid não encontrado'), { status: 404 });
  if (bid.plantao.hospitalId !== hospital.id) throw Object.assign(new Error('Acesso negado'), { status: 403 });

  // Accept this bid, update plantao status, reject others
  await prisma.$transaction([
    prisma.bids.update({ where: { id: Number(bidId) }, data: { aceitoEm: new Date() } }),
    prisma.plantoes.update({
      where: { id: bid.plantaoId },
      data: { status: 'CONFIRMADO', medicoId: bid.medicoId, valorFinal: bid.valorProposto },
    }),
    prisma.candidaturas.update({
      where: { id: bid.candidaturaId },
      data: { status: 'ACEITA', respondidoEm: new Date() },
    }),
    prisma.candidaturas.updateMany({
      where: { plantaoId: bid.plantaoId, id: { not: bid.candidaturaId }, status: 'PENDENTE' },
      data: { status: 'REJEITADA', respondidoEm: new Date() },
    }),
  ]);

  sendToUser(bid.medico.usuario.id, { type: 'bid_resposta', status: 'ACEITO', plantaoId: bid.plantaoId });
  return { success: true };
}

async function rejeitarBid(bidId, userId) {
  const hospital = await prisma.hospitais.findFirst({ where: { usuarioId: userId } });
  const bid = await prisma.bids.findUnique({
    where: { id: Number(bidId) },
    include: { plantao: true, medico: { include: { usuario: true } } },
  });
  if (!bid) throw Object.assign(new Error('Bid não encontrado'), { status: 404 });
  if (bid.plantao.hospitalId !== hospital.id) throw Object.assign(new Error('Acesso negado'), { status: 403 });

  await prisma.bids.update({ where: { id: Number(bidId) }, data: { rejeitadoEm: new Date() } });
  sendToUser(bid.medico.usuario.id, { type: 'bid_resposta', status: 'REJEITADO', plantaoId: bid.plantaoId });
  return { success: true };
}

module.exports = { criarBid, aceitarBid, rejeitarBid };
