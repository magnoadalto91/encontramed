'use strict';

require('dotenv').config();

const express = require('express');
const http = require('http');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');

const corsOptions = require('./src/config/cors');
const { initWebSocket } = require('./src/config/websocket');
const errorHandler = require('./src/middlewares/errorHandler');
const logger = require('./src/utils/logger');

// Routes
const authRoutes = require('./src/modules/auth/auth.routes');
const especialidadesRoutes = require('./src/modules/especialidades/especialidades.routes');
const medicosRoutes = require('./src/modules/medicos/medicos.routes');
const hospitaisRoutes = require('./src/modules/hospitais/hospitais.routes');
const plantoesRoutes = require('./src/modules/plantoes/plantoes.routes');
const candidaturasRoutes = require('./src/modules/candidaturas/candidaturas.routes');
const bidsRoutes = require('./src/modules/bids/bids.routes');
const escalasRoutes = require('./src/modules/escalas/escalas.routes');
const trocasRoutes = require('./src/modules/trocas/trocas.routes');
const documentosRoutes = require('./src/modules/documentos/documentos.routes');
const contratosRoutes = require('./src/modules/contratos/contratos.routes');
const financeiroRoutes = require('./src/modules/financeiro/financeiro.routes');
const notificacoesRoutes = require('./src/modules/notificacoes/notificacoes.routes');
const geoRoutes = require('./src/modules/geolocalizacao/geo.routes');
const adminRoutes = require('./src/modules/admin/admin.routes');

const app = express();
const server = http.createServer(app);

// ─── Security ────────────────────────────────────────────────────────────────

app.use(helmet({
  contentSecurityPolicy: false,     // disabled — admin uses inline scripts
  crossOriginEmbedderPolicy: false, // needed for external resources
}));

app.use(cors(corsOptions));

// ─── Body Parsing ─────────────────────────────────────────────────────────────

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ─── Static Files (Admin Panel dist) ─────────────────────────────────────────

app.use(express.static(path.join(__dirname, 'public')));

// ─── API Routes ──────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/especialidades', especialidadesRoutes);
app.use('/api/medicos', medicosRoutes);
app.use('/api/hospitais', hospitaisRoutes);
app.use('/api/plantoes', plantoesRoutes);
app.use('/api/candidaturas', candidaturasRoutes);
app.use('/api/bids', bidsRoutes);
app.use('/api/escalas', escalasRoutes);
app.use('/api/trocas', trocasRoutes);
app.use('/api/documentos', documentosRoutes);
app.use('/api/contratos', contratosRoutes);
app.use('/api/financeiro', financeiroRoutes);
app.use('/api/notificacoes', notificacoesRoutes);
app.use('/api/geo', geoRoutes);
app.use('/api/admin', adminRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV, ts: new Date().toISOString() });
});

// ─── SPA Fallback for Admin ───────────────────────────────────────────────────

app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html'));
});

// ─── Error Handler ───────────────────────────────────────────────────────────

app.use(errorHandler);

// ─── WebSocket ────────────────────────────────────────────────────────────────

initWebSocket(server);

// ─── Cron Jobs ────────────────────────────────────────────────────────────────

if (process.env.NODE_ENV !== 'test') {
  try {
    require('./src/jobs/scheduler');
    logger.info('Cron jobs iniciados');
  } catch (err) {
    logger.error('Falha ao iniciar cron jobs:', err.message);
  }
}

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  logger.info(`EncontraMed API rodando na porta ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

module.exports = app;
