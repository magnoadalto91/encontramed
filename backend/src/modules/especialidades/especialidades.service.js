'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listAll() {
  return prisma.especialidades.findMany({ orderBy: { nome: 'asc' } });
}

async function getById(id) {
  const esp = await prisma.especialidades.findUnique({ where: { id: Number(id) } });
  if (!esp) throw Object.assign(new Error('Especialidade não encontrada'), { status: 404 });
  return esp;
}

async function create(data) {
  const { nome, codigo, descricao } = data;
  if (!nome || !codigo) throw Object.assign(new Error('Nome e código são obrigatórios'), { status: 400 });
  return prisma.especialidades.create({ data: { nome, codigo, descricao } });
}

async function update(id, data) {
  await getById(id);
  return prisma.especialidades.update({ where: { id: Number(id) }, data });
}

async function remove(id) {
  await getById(id);
  return prisma.especialidades.delete({ where: { id: Number(id) } });
}

module.exports = { listAll, getById, create, update, remove };
