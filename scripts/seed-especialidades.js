/**
 * Seed especialidades médicas com códigos CFM
 * Run: node scripts/seed-especialidades.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ESPECIALIDADES = [
  { codigo: '01', nome: 'Acupuntura', descricao: 'Medicina tradicional chinesa baseada em meridianos e pontos de energia' },
  { codigo: '02', nome: 'Alergia e Imunologia', descricao: 'Doenças alérgicas e do sistema imunológico' },
  { codigo: '03', nome: 'Anestesiologia', descricao: 'Anestesia e cuidados perioperatórios' },
  { codigo: '04', nome: 'Angiologia', descricao: 'Doenças dos vasos sanguíneos e linfáticos' },
  { codigo: '05', nome: 'Cancerologia / Oncologia', descricao: 'Diagnóstico e tratamento do câncer' },
  { codigo: '06', nome: 'Cardiologia', descricao: 'Doenças do coração e sistema cardiovascular' },
  { codigo: '07', nome: 'Cirurgia Cardiovascular', descricao: 'Cirurgias do coração e grandes vasos' },
  { codigo: '08', nome: 'Cirurgia da Mão', descricao: 'Cirurgias das mãos e punhos' },
  { codigo: '09', nome: 'Cirurgia de Cabeça e Pescoço', descricao: 'Tumores e doenças da cabeça e pescoço' },
  { codigo: '10', nome: 'Cirurgia do Aparelho Digestivo', descricao: 'Cirurgias do trato gastrointestinal' },
  { codigo: '11', nome: 'Cirurgia Geral', descricao: 'Procedimentos cirúrgicos gerais' },
  { codigo: '12', nome: 'Cirurgia Pediátrica', descricao: 'Cirurgias em crianças e adolescentes' },
  { codigo: '13', nome: 'Cirurgia Plástica', descricao: 'Cirurgias reconstrutivas e estéticas' },
  { codigo: '14', nome: 'Cirurgia Torácica', descricao: 'Cirurgias do tórax e pulmões' },
  { codigo: '15', nome: 'Cirurgia Vascular', descricao: 'Cirurgias dos vasos sanguíneos' },
  { codigo: '16', nome: 'Clínica Médica', descricao: 'Medicina interna geral' },
  { codigo: '17', nome: 'Coloproctologia', descricao: 'Doenças do cólon, reto e ânus' },
  { codigo: '18', nome: 'Dermatologia', descricao: 'Doenças da pele, cabelo e unhas' },
  { codigo: '19', nome: 'Endocrinologia e Metabologia', descricao: 'Doenças hormonais e metabólicas' },
  { codigo: '20', nome: 'Endoscopia', descricao: 'Procedimentos endoscópicos diagnósticos e terapêuticos' },
  { codigo: '21', nome: 'Gastroenterologia', descricao: 'Doenças do aparelho digestivo' },
  { codigo: '22', nome: 'Genética Médica', descricao: 'Doenças genéticas e hereditárias' },
  { codigo: '23', nome: 'Geriatria', descricao: 'Saúde do idoso' },
  { codigo: '24', nome: 'Ginecologia e Obstetrícia', descricao: 'Saúde da mulher e gestação' },
  { codigo: '25', nome: 'Hematologia e Hemoterapia', descricao: 'Doenças do sangue e transfusões' },
  { codigo: '26', nome: 'Homeopatia', descricao: 'Medicina homeopática' },
  { codigo: '27', nome: 'Infectologia', descricao: 'Doenças infecciosas e parasitárias' },
  { codigo: '28', nome: 'Mastologia', descricao: 'Doenças da mama' },
  { codigo: '29', nome: 'Medicina de Emergência', descricao: 'Atendimento emergencial e urgências' },
  { codigo: '30', nome: 'Medicina de Família e Comunidade', descricao: 'Atenção primária e saúde da família' },
  { codigo: '31', nome: 'Medicina do Trabalho', descricao: 'Saúde ocupacional e doenças do trabalho' },
  { codigo: '32', nome: 'Medicina do Tráfego', descricao: 'Avaliação de motoristas e segurança no trânsito' },
  { codigo: '33', nome: 'Medicina Esportiva', descricao: 'Saúde e lesões no esporte' },
  { codigo: '34', nome: 'Medicina Física e Reabilitação', descricao: 'Reabilitação física e funcional' },
  { codigo: '35', nome: 'Medicina Intensiva', descricao: 'Cuidados intensivos e UTI' },
  { codigo: '36', nome: 'Medicina Legal e Perícia Médica', descricao: 'Laudos e perícias médico-legais' },
  { codigo: '37', nome: 'Medicina Nuclear', descricao: 'Diagnóstico e terapia com radiofármacos' },
  { codigo: '38', nome: 'Medicina Preventiva e Social', descricao: 'Epidemiologia e saúde coletiva' },
  { codigo: '39', nome: 'Nefrologia', descricao: 'Doenças dos rins' },
  { codigo: '40', nome: 'Neurocirurgia', descricao: 'Cirurgias do sistema nervoso' },
  { codigo: '41', nome: 'Neurologia', descricao: 'Doenças do sistema nervoso' },
  { codigo: '42', nome: 'Nutrologia', descricao: 'Nutrição clínica e distúrbios nutricionais' },
  { codigo: '43', nome: 'Oftalmologia', descricao: 'Doenças dos olhos' },
  { codigo: '44', nome: 'Ortopedia e Traumatologia', descricao: 'Doenças do sistema musculoesquelético' },
  { codigo: '45', nome: 'Otorrinolaringologia', descricao: 'Doenças do ouvido, nariz e garganta' },
  { codigo: '46', nome: 'Patologia', descricao: 'Diagnóstico por análise de tecidos e células' },
  { codigo: '47', nome: 'Patologia Clínica / Medicina Laboratorial', descricao: 'Análises clínicas laboratoriais' },
  { codigo: '48', nome: 'Pediatria', descricao: 'Saúde de crianças e adolescentes' },
  { codigo: '49', nome: 'Pneumologia', descricao: 'Doenças do aparelho respiratório' },
  { codigo: '50', nome: 'Psiquiatria', descricao: 'Saúde mental e transtornos psiquiátricos' },
  { codigo: '51', nome: 'Radiologia e Diagnóstico por Imagem', descricao: 'Diagnóstico por imagem' },
  { codigo: '52', nome: 'Radioterapia', descricao: 'Tratamento do câncer com radiação' },
  { codigo: '53', nome: 'Reumatologia', descricao: 'Doenças reumáticas e autoimunes' },
  { codigo: '54', nome: 'Urologia', descricao: 'Doenças do aparelho urinário e genital masculino' },
];

async function main() {
  console.log('Seeding especialidades...');

  for (const esp of ESPECIALIDADES) {
    await prisma.especialidades.upsert({
      where: { codigo: esp.codigo },
      update: { nome: esp.nome, descricao: esp.descricao },
      create: esp,
    });
  }

  console.log(`✓ ${ESPECIALIDADES.length} especialidades inseridas/atualizadas`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
