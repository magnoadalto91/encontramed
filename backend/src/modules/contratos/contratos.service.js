'use strict';
const { PrismaClient } = require('@prisma/client');
const PDFDocument = require('pdfkit');
const prisma = new PrismaClient();

function pad2(n) { return String(n).padStart(2,'0'); }
function fmtDate(d) { const dt = new Date(d); return `${pad2(dt.getDate())}/${pad2(dt.getMonth()+1)}/${dt.getFullYear()}`; }
function fmtDateTime(d) { const dt = new Date(d); return `${pad2(dt.getDate())}/${pad2(dt.getMonth()+1)}/${dt.getFullYear()} às ${pad2(dt.getHours())}h${pad2(dt.getMinutes())}`; }
function fmtMoney(v) { return Number(v).toLocaleString('pt-BR', { style:'currency', currency:'BRL' }); }

async function gerarOuObter(plantaoId, userId) {
  const plantao = await prisma.plantoes.findUnique({
    where: { id: Number(plantaoId) },
    include: {
      hospital: true,
      medico: { include: { usuario: true } },
      especialidade: true,
    },
  });
  if (!plantao) throw Object.assign(new Error('Plantão não encontrado'), { status: 404 });

  // Access check
  const isHospital = plantao.hospital.usuarioId === userId;
  const isMedico   = plantao.medico?.usuarioId === userId;
  if (!isHospital && !isMedico) throw Object.assign(new Error('Sem acesso'), { status: 403 });

  // Get or create contrato
  let contrato = await prisma.contratos.findFirst({ where: { plantaoId: Number(plantaoId) } });
  if (!contrato) {
    const medicoRecord  = await prisma.medicos.findFirst({ where: { usuarioId: plantao.medico?.usuarioId } });
    const hospitalRecord = plantao.hospital;
    contrato = await prisma.contratos.create({
      data: {
        medicoId: medicoRecord?.id || plantao.medicoId,
        hospitalId: hospitalRecord.id,
        plantaoId: Number(plantaoId),
        status: 'PENDENTE_ASSINATURA',
        conteudoJson: buildConteudo(plantao),
      },
    });
  }

  return { contrato, plantao };
}

function buildConteudo(plantao) {
  return {
    plantaoId: plantao.id,
    titulo: plantao.titulo,
    especialidade: plantao.especialidade?.nome,
    dataInicio: plantao.dataInicio,
    dataFim: plantao.dataFim,
    duracaoHoras: plantao.duracaoHoras,
    valorBase: plantao.valorBase,
    tipoValor: plantao.tipoValor,
    localNome: plantao.localNome,
    localCidade: plantao.localCidade,
    localUf: plantao.localUf,
    hospital: {
      razaoSocial: plantao.hospital.razaoSocial,
      nomeFantasia: plantao.hospital.nomeFantasia,
      cnpj: plantao.hospital.cnpj,
      codigoCNES: plantao.hospital.codigoCNES,
      enderecoCidade: plantao.hospital.enderecoCidade,
      enderecoEstado: plantao.hospital.enderecoEstado,
    },
    medico: {
      nomeCompleto: plantao.medico?.usuario?.nomeCompleto,
      crm: plantao.medico?.crm,
      crmUf: plantao.medico?.crmUf,
      cpf: plantao.medico?.cpf,
      cnpj: plantao.medico?.cnpj,
    },
  };
}

async function gerarPDF(plantaoId, userId) {
  const { contrato, plantao } = await gerarOuObter(plantaoId, userId);
  const c = contrato.conteudoJson || buildConteudo(plantao);
  const valor = c.tipoValor === 'POR_HORA'
    ? `${fmtMoney(c.valorBase)}/hora (total estimado: ${fmtMoney(Number(c.valorBase) * Number(c.duracaoHoras))})`
    : fmtMoney(c.valorBase);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 60, size: 'A4' });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(18).font('Helvetica-Bold').text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS MÉDICOS', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('EncontraMed — Plataforma de Conexão Médica', { align: 'center' });
    doc.moveDown(1.5);

    // Parties
    doc.fontSize(12).font('Helvetica-Bold').text('DAS PARTES');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica');
    doc.text(`CONTRATANTE: ${c.hospital?.nomeFantasia || c.hospital?.razaoSocial} — CNPJ ${c.hospital?.cnpj}${c.hospital?.codigoCNES ? ` — CNES ${c.hospital?.codigoCNES}` : ''}`);
    doc.text(`Local: ${c.hospital?.enderecoCidade || ''} – ${c.hospital?.enderecoEstado || ''}`);
    doc.moveDown(0.5);
    doc.text(`CONTRATADO: Dr(a). ${c.medico?.nomeCompleto} — CRM ${c.medico?.crm}/${c.medico?.crmUf}${c.medico?.cpf ? ` — CPF ${c.medico.cpf}` : ''}${c.medico?.cnpj ? ` — CNPJ ${c.medico.cnpj}` : ''}`);
    doc.moveDown(1.5);

    // Objeto
    doc.fontSize(12).font('Helvetica-Bold').text('DO OBJETO');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Prestação de serviços médicos na especialidade de ${c.especialidade || 'Medicina Geral'}, conforme detalhes abaixo:`);
    doc.moveDown(0.5);
    doc.text(`Plantão: ${c.titulo || 'Plantão #' + c.plantaoId}`);
    doc.text(`Data/Hora de Início: ${fmtDateTime(c.dataInicio)}`);
    doc.text(`Data/Hora de Fim:    ${fmtDateTime(c.dataFim)}`);
    doc.text(`Duração: ${c.duracaoHoras} horas`);
    doc.text(`Local: ${[c.localNome, c.localCidade, c.localUf].filter(Boolean).join(', ') || 'Conforme combinado'}`);
    doc.moveDown(1.5);

    // Remuneração
    doc.fontSize(12).font('Helvetica-Bold').text('DA REMUNERAÇÃO');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Valor acordado: ${valor}`);
    doc.text('O pagamento será realizado diretamente pelo Contratante ao Contratado, no prazo e forma combinados entre as partes.');
    doc.moveDown(1.5);

    // Obrigações
    doc.fontSize(12).font('Helvetica-Bold').text('DAS OBRIGAÇÕES');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica');
    doc.text('1. O Contratado se compromete a comparecer no horário e local acordados, apresentando CRM ativo.');
    doc.text('2. O Contratante se compromete a disponibilizar estrutura adequada e realizar o pagamento conforme acordado.');
    doc.text('3. Cancelamentos devem ser comunicados com no mínimo 24 horas de antecedência, salvo casos de força maior.');
    doc.moveDown(1.5);

    // Validade — Lei 14.063/2020 prominent section
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#000').text('DA VALIDADE JURÍDICA DO ACEITE ELETRÔNICO');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#000').text('Fundamento Legal: Lei Federal nº 14.063, de 23 de setembro de 2020');
    doc.fontSize(10).font('Helvetica').fillColor('#333');
    doc.moveDown(0.3);
    doc.text('Este instrumento constitui Assinatura Eletrônica Simples (Tipo 1), modalidade expressamente reconhecida pelo art. 4º, inciso I, da Lei nº 14.063/2020, que dispõe sobre o uso de assinaturas eletrônicas em interações com entes públicos e privados e produz os mesmos efeitos jurídicos de uma assinatura manuscrita, nos termos do art. 5º da referida Lei.', { align: 'justify' });
    doc.moveDown(0.5);
    doc.text('Ao clicar em "Aceitar Contrato" na Plataforma EncontraMed, a parte registra sua manifestação de vontade livre, consciente e inequívoca, conforme exige o art. 3º da Lei nº 14.063/2020. O sistema registra automaticamente:', { align: 'justify' });
    doc.moveDown(0.3);
    doc.text('  • Data e hora exata do aceite (fuso horário UTC−3, horário de Brasília)');
    doc.text('  • Endereço IP do dispositivo utilizado no aceite');
    doc.text('  • Identificador único do usuário autenticado na plataforma');
    doc.text('  • User-Agent (identificação do navegador/aplicativo)');
    doc.moveDown(0.5);
    doc.text('O conjunto dessas informações constitui prova eletrônica de autoria e integridade, com validade probatória reconhecida pelo art. 6º da Lei nº 14.063/2020 e pelo art. 10, § 2º, da Medida Provisória nº 2.200-2/2001 (ICP-Brasil).', { align: 'justify' });
    doc.moveDown(2);

    // Signature area
    doc.fontSize(10).font('Helvetica');
    doc.text('___________________________________          ___________________________________', { align: 'center' });
    doc.text(`${c.hospital?.nomeFantasia || c.hospital?.razaoSocial}          Dr(a). ${c.medico?.nomeCompleto}`, { align: 'center' });
    doc.text('Contratante                                          Contratado', { align: 'center' });
    doc.moveDown(1);

    doc.moveDown(0.5);
    if (contrato.status === 'ASSINADO' && contrato.assinadoEm) {
      doc.rect(60, doc.y, doc.page.width - 120, 48).fill('#f0f7f0').stroke('#2ecc71');
      doc.moveUp(0);
      doc.fillColor('#1a7a3a').fontSize(9).font('Helvetica-Bold').text('✔ CONTRATO ACEITO ELETRONICAMENTE — LEI Nº 14.063/2020', { align: 'center' });
      doc.fillColor('#333').font('Helvetica').text(`Data/Hora: ${fmtDateTime(contrato.assinadoEm)} (horário de Brasília)`, { align: 'center' });
      doc.text(`IP do Dispositivo: ${contrato.aceiteIp || 'registrado'} | Protocolo: ENM-${contrato.id}-${new Date(contrato.assinadoEm).getTime()}`, { align: 'center' });
    } else {
      doc.rect(60, doc.y, doc.page.width - 120, 30).fill('#fff8f0').stroke('#e67e22');
      doc.fillColor('#c0392b').fontSize(9).font('Helvetica-Bold').text('⚠ AGUARDANDO ACEITE ELETRÔNICO — Contrato não possui validade até assinatura de ambas as partes', { align: 'center' });
      doc.fillColor('#555').font('Helvetica');
    }

    doc.end();
  });
}

async function aceitarContrato(plantaoId, userId, ip, userAgent) {
  const { contrato } = await gerarOuObter(plantaoId, userId);
  if (contrato.status === 'ASSINADO') return contrato; // already accepted
  return prisma.contratos.update({
    where: { id: contrato.id },
    data: {
      status: 'ASSINADO',
      assinadoEm: new Date(),
      aceiteIp: ip,
      aceiteUserAgent: userAgent?.slice(0, 500),
    },
  });
}

async function getStatus(plantaoId, userId) {
  const { contrato } = await gerarOuObter(plantaoId, userId);
  return contrato;
}

module.exports = { gerarPDF, aceitarContrato, getStatus };
