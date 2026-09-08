EncontraMed

Plataforma que conecta hospitais e clínicas a médicos para o preenchimento de plantões. É composta por uma API própria, um aplicativo mobile e um painel administrativo.

Stack

Backend: Node.js, Express 4, Prisma ORM, PostgreSQL Mobile: React Native com Expo 54, React Navigation 6, EAS Build Admin: HTML, CSS e JavaScript, servidos pelo próprio backend Autenticação: JWT (payload com userId, role e sid) e bcrypt Armazenamento: S3 compatível, com URLs pré-assinadas Outros: WebSocket para atualizações em tempo real, PDFKit para geração de contratos, node-cron para rotinas agendadas, Nodemailer e Resend para e-mail, Helmet e express-rate-limit para segurança

Funcionalidades
Cadastro de hospitais e médicos, com validação de CRM por integração com serviço externo de consulta de registro profissional
Publicação e candidatura a plantões, incluindo plantões recorrentes
Geração automática de contrato em PDF a cada plantão fechado
Avaliações mútuas entre hospital e profissional
Carteira do médico, com histórico de plantões e valores
Notificações push no aplicativo (Expo Push com Firebase)
Painel administrativo para gestão de usuários, plantões e chamados
Estrutura
backend/     API Express, schema Prisma e rotinas agendadas
frontend/    fonte do painel administrativo
mobile/      aplicativo React Native (Expo)
scripts/     utilitários de build e manutenção

O painel web segue o fluxo fonte/artefato: edite sempre em frontend/ e gere o conteúdo servido em backend/public/. Nunca edite diretamente o diretório publicado.

Como rodar

Pré-requisitos: Node.js 20 ou superior, PostgreSQL e Expo CLI para o aplicativo.

bash
# backend
cd backend
npm install
cp .env.example .env      # preencha as variáveis
npm run db:push
npm run db:seed
npm run dev

# mobile
cd mobile
npm install
npm start
Variáveis de ambiente

O backend espera, no mínimo: DATABASE_URL, JWT_SECRET, credenciais do bucket de arquivos, chave do serviço de e-mail e a chave da API de consulta de CRM. A validação de CRM só funciona em produção, com a chave configurada.

Convenções do projeto
Alterações que não especificam a plataforma valem para web e mobile
Sem alert() ou confirm() nativos: usar os modais próprios da aplicação
Nunca rodar prisma db push --force-reset em produção
Arquivos de credencial (.env, chaves de serviço) nunca são versionados
