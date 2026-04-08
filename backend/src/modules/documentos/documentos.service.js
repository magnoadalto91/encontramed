'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { uploadFile, getPresignedUrl, deleteFile } = require('../../config/r2');
const { processarDocumento } = require('./ocr.service');
const logger = require('../../utils/logger');

async function upload(userId, file, tipo) {
  const medico = await prisma.medicos.findFirst({ where: { usuarioId: userId } });
  if (!medico) throw Object.assign(new Error('Perfil de médico não encontrado'), { status: 404 });

  const timestamp = Date.now();
  const ext = file.originalname.split('.').pop().toLowerCase();
  const r2Key = `documentos/${medico.id}/${tipo}/${timestamp}_${file.originalname.replace(/\s/g, '_')}`;

  // Upload to R2
  await uploadFile(file.buffer, r2Key, file.mimetype);

  const doc = await prisma.documentos.create({
    data: {
      medicoId: medico.id,
      tipo,
      status: 'PROCESSANDO',
      nomeArquivo: file.originalname,
      urlR2: r2Key,
      mimeType: file.mimetype,
      tamanhoBytes: file.size,
    },
  });

  // Run OCR async — don't block the upload response
  _processarOCRAsync(doc.id, file.buffer, file.mimetype, tipo);

  return doc;
}

async function _processarOCRAsync(docId, buffer, mimeType, tipo) {
  try {
    const { texto, dadosJson, confianca } = await processarDocumento(buffer, mimeType, tipo);
    const status = confianca > 60 ? 'PENDENTE' : 'PENDENTE'; // always needs admin review

    await prisma.documentos.update({
      where: { id: docId },
      data: { ocrTexto: texto, ocrDadosJson: dadosJson, status },
    });
  } catch (err) {
    logger.error(`[documentos] OCR falhou para doc ${docId}:`, err.message);
    await prisma.documentos.update({ where: { id: docId }, data: { status: 'PENDENTE' } });
  }
}

async function getMeus(userId) {
  const medico = await prisma.medicos.findFirst({ where: { usuarioId: userId } });
  return prisma.documentos.findMany({
    where: { medicoId: medico.id },
    orderBy: { criadoEm: 'desc' },
  });
}

async function getPresignedDocUrl(docId, userId) {
  const medico = await prisma.medicos.findFirst({ where: { usuarioId: userId } });
  const doc = await prisma.documentos.findUnique({ where: { id: Number(docId) } });
  if (!doc) throw Object.assign(new Error('Documento não encontrado'), { status: 404 });
  if (doc.medicoId !== medico.id) throw Object.assign(new Error('Acesso negado'), { status: 403 });

  const url = await getPresignedUrl(doc.urlR2, 3600); // 1 hour
  return { url, expiresIn: 3600 };
}

async function listarPendentes(page = 1, limit = 20) {
  const skip = (Number(page) - 1) * Number(limit);
  const [documentos, total] = await Promise.all([
    prisma.documentos.findMany({
      where: { status: 'PENDENTE' },
      skip, take: Number(limit),
      include: { medico: { include: { usuario: { select: { nomeCompleto: true, email: true } } } } },
      orderBy: { criadoEm: 'asc' },
    }),
    prisma.documentos.count({ where: { status: 'PENDENTE' } }),
  ]);
  return { documentos, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
}

async function validar(docId, revisorId) {
  const doc = await prisma.documentos.findUnique({ where: { id: Number(docId) } });
  if (!doc) throw Object.assign(new Error('Documento não encontrado'), { status: 404 });

  return prisma.documentos.update({
    where: { id: Number(docId) },
    data: { status: 'VALIDADO', revisorId, validadoEm: new Date() },
  });
}

async function rejeitar(docId, revisorId, motivoRejeicao) {
  const doc = await prisma.documentos.findUnique({ where: { id: Number(docId) } });
  if (!doc) throw Object.assign(new Error('Documento não encontrado'), { status: 404 });

  return prisma.documentos.update({
    where: { id: Number(docId) },
    data: { status: 'REJEITADO', revisorId, motivoRejeicao },
  });
}

module.exports = { upload, getMeus, getPresignedDocUrl, listarPendentes, validar, rejeitar };
