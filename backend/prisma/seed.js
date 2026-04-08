'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

const ESPECIALIDADES = [
  { codigo: '01', nome: 'Acupuntura' },
  { codigo: '02', nome: 'Alergia e Imunologia' },
  { codigo: '03', nome: 'Anestesiologia' },
  { codigo: '04', nome: 'Angiologia' },
  { codigo: '05', nome: 'Cancerologia / Oncologia' },
  { codigo: '06', nome: 'Cardiologia' },
  { codigo: '07', nome: 'Cirurgia Cardiovascular' },
  { codigo: '08', nome: 'Cirurgia Geral' },
  { codigo: '09', nome: 'Cirurgia Pediátrica' },
  { codigo: '10', nome: 'Cirurgia Plástica' },
  { codigo: '11', nome: 'Cirurgia Vascular' },
  { codigo: '12', nome: 'Clínica Médica' },
  { codigo: '13', nome: 'Coloproctologia' },
  { codigo: '14', nome: 'Dermatologia' },
  { codigo: '15', nome: 'Endocrinologia e Metabologia' },
  { codigo: '16', nome: 'Gastroenterologia' },
  { codigo: '17', nome: 'Geriatria' },
  { codigo: '18', nome: 'Ginecologia e Obstetrícia' },
  { codigo: '19', nome: 'Hematologia e Hemoterapia' },
  { codigo: '20', nome: 'Infectologia' },
  { codigo: '21', nome: 'Mastologia' },
  { codigo: '22', nome: 'Medicina de Emergência' },
  { codigo: '23', nome: 'Medicina de Família e Comunidade' },
  { codigo: '24', nome: 'Medicina Intensiva' },
  { codigo: '25', nome: 'Nefrologia' },
  { codigo: '26', nome: 'Neurocirurgia' },
  { codigo: '27', nome: 'Neurologia' },
  { codigo: '28', nome: 'Oftalmologia' },
  { codigo: '29', nome: 'Ortopedia e Traumatologia' },
  { codigo: '30', nome: 'Otorrinolaringologia' },
  { codigo: '31', nome: 'Pediatria' },
  { codigo: '32', nome: 'Pneumologia' },
  { codigo: '33', nome: 'Psiquiatria' },
  { codigo: '34', nome: 'Radiologia e Diagnóstico por Imagem' },
  { codigo: '35', nome: 'Reumatologia' },
  { codigo: '36', nome: 'Urologia' },
];

const CONFIGURACOES = [
  { chave: 'taxa_plataforma', valor: '0.15', descricao: 'Taxa da plataforma (15% sobre o valor bruto)' },
  { chave: 'session_max_medico', valor: '2', descricao: 'Máximo de sessões simultâneas para MÉDICO' },
  { chave: 'session_max_hospital', valor: '3', descricao: 'Máximo de sessões simultâneas para HOSPITAL' },
  { chave: 'session_max_admin', valor: '10', descricao: 'Máximo de sessões simultâneas para ADMIN' },
  { chave: 'session_max_suporte', valor: '3', descricao: 'Máximo de sessões simultâneas para SUPORTE' },
  { chave: 'push_raio_inicial_km', valor: '20', descricao: 'Raio inicial de notificação push (km)' },
  { chave: 'push_raio_expansao_km', valor: '50', descricao: 'Raio de expansão após 30min sem confirmação (km)' },
  { chave: 'escala_horizonte_dias', valor: '60', descricao: 'Dias de antecedência para geração de plantões de escala' },
  { chave: 'ocr_confianca_minima', valor: '60', descricao: 'Confiança mínima do OCR para validação automática (%)' },
];

async function main() {
  console.log('🌱 Iniciando seed do EncontraMed...\n');

  // 1. Admin user
  const adminEmail = 'admin@encontramed.com.br';
  const adminSenha = 'Admin@123';
  const existing = await prisma.usuarios.findUnique({ where: { email: adminEmail } });

  if (!existing) {
    const senhaHash = await bcrypt.hash(adminSenha, 10);
    await prisma.usuarios.create({
      data: {
        email: adminEmail,
        senhaHash,
        nomeCompleto: 'Administrador EncontraMed',
        role: 'ADMIN',
        ativo: true,
        emailVerificado: true,
      },
    });
    console.log(`✓ Admin criado: ${adminEmail} / ${adminSenha}`);
  } else {
    console.log(`• Admin já existe: ${adminEmail}`);
  }

  // 2. Especialidades
  console.log('\n📋 Inserindo especialidades...');
  for (const esp of ESPECIALIDADES) {
    await prisma.especialidades.upsert({
      where: { codigo: esp.codigo },
      create: esp,
      update: { nome: esp.nome },
    });
  }
  console.log(`✓ ${ESPECIALIDADES.length} especialidades inseridas`);

  // 3. Configurações
  console.log('\n⚙️  Inserindo configurações...');
  for (const config of CONFIGURACOES) {
    await prisma.configuracoes.upsert({
      where: { chave: config.chave },
      create: config,
      update: { valor: config.valor, descricao: config.descricao },
    });
  }
  console.log(`✓ ${CONFIGURACOES.length} configurações inseridas`);

  console.log('\n✅ Seed concluído com sucesso!');
}

main()
  .catch(err => { console.error('❌ Seed falhou:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
