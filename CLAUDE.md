# Base de Conhecimento — Transferível de Projeto Keyu

> Este arquivo é um destilado de tudo que foi aprendido, depurado e auditado durante o desenvolvimento do Keyu.
> Use como ponto de partida em qualquer novo projeto com stack semelhante (Node.js + Prisma + React Native + Expo + Railway).
> Contém: padrões de arquitetura, armadilhas mapeadas, checklist de segurança completo, decisões de infraestrutura e regras de comportamento do Claude.

---

## Regras de comportamento do Claude neste projeto

- Autorizado a fazer `git add + commit + push` automaticamente após qualquer alteração — sem pedir confirmação.
- Atualizar o CLAUDE.md imediatamente sempre que aprender algo novo: decisão técnica, bug corrigido, preferência do usuário.
- Quando a plataforma não for especificada: aplicar em **todas** (web + mobile).
- Nunca usar `alert()` ou `confirm()` nativos. Criar sempre modais customizados com a identidade visual do projeto.
- Nunca usar `prisma db push --force-reset` em produção — apaga todos os dados. Para schema changes: `npx prisma db push` (sem flags).

---

## Stack e arquitetura geral

| Camada | Tecnologia |
|---|---|
| Backend | Node.js + Express + Prisma ORM |
| Banco | PostgreSQL (Railway → migrar para Neon.tech) |
| Frontend web | HTML + CSS + JS puro (admin) / ou framework |
| Mobile | React Native + Expo (EAS Build) |
| Auth | JWT (payload: `userId`, `role`, `sid`) |
| Tempo real | WebSocket (`ws`) |
| Deploy | Railway |
| Storage de arquivos | Disco local Railway → migrar para Cloudflare R2 |
| Email | Resend API |
| Push Notifications | Expo Push API + Firebase FCM |

---

## Fluxo obrigatório — frontend web (fonte vs. dist)

Nunca editar o arquivo servido diretamente. Manter sempre dois diretórios:
- `frontend/` → fonte, editável, commitada
- `backend/public/` → dist, servida pelo Express, gerada por script

Para arquivos com JS inline sensível: usar `javascript-obfuscator` via script de build.

```bash
# Exemplo de script: scripts/build-frontend.js
# Lê frontend/site/index.html → ofusca blocos <script> inline → grava backend/public/site/index.html
node scripts/build-frontend.js
```

Configuração segura do obfuscator:
```javascript
{
  compact: true,
  renameGlobals: false,       // CRÍTICO: false → preserva funções usadas em onclick=""
  controlFlowFlattening: false, // pode quebrar lógica complexa
  stringArray: true,
  stringArrayEncoding: ['base64'],
  selfDefending: false,       // pode causar problemas em alguns browsers
  debugProtection: false,     // trava DevTools até do desenvolvedor
  sourceMap: false,
}
```

---

## Segurança — Checklist completo (auditoria pré-produção)

### 🔴 CRÍTICO — fazer antes de qualquer deploy

**1. Chaves e segredos no git**
- Nunca commitar: `google-services.json`, `firebase-adminsdk-*.json`, `.env`, qualquer arquivo com chave privada
- `.gitignore` mínimo: `.env`, `*.json` nas pastas mobile (com exceção de `app.json`, `package.json`, `package-lock.json`)
- Se já foi commitado: `git rm --cached <arquivo>` + revogar a chave imediatamente
- Arquivo precisa existir localmente mas fora do rastreamento git

**2. WebSocket — autenticar pelo JWT, nunca pelo userId**

```javascript
// ❌ VULNERÁVEL — qualquer cliente pode se registrar como qualquer userId
if (data.type === 'auth' && data.userId) {
  clients.set(data.userId, ws);
}

// ✅ SEGURO — userId extraído do JWT verificado pelo servidor
if (data.type === 'auth' && data.token) {
  const decoded = jwt.verify(data.token, process.env.JWT_SECRET);
  clients.set(decoded.userId, ws);
}
```

Cliente envia `{ type: 'auth', token }` (JWT), nunca `userId` diretamente.

**3. Rate limiting em todas as rotas de autenticação**

```javascript
// express-rate-limit — limites recomendados
loginLimiter:    10 req / 15 min por IP   // POST /auth/login, /auth/recuperar-senha
registerLimiter:  5 req / 1h por IP       // POST /auth/register
emailLimiter:     3 req / 15 min por IP   // /auth/verificar, /reenviar-verificacao

// ATENÇÃO: express-rate-limit v7 removeu ipKeyGenerator. Usar normalizeIp manual:
const normalizeIp = (ip) => {
  if (!ip) return 'unknown';
  if (ip.startsWith('::ffff:')) return ip.slice(7); // IPv6-mapped IPv4
  return ip;
};
keyGenerator: (req) => req.userId ? String(req.userId) : normalizeIp(req.ip)
```

---

### 🟠 ALTO — corrigir antes do lançamento

**4. CORS — nunca usar wildcard ou `origin === 'null'`**

```javascript
// ❌ PERIGOSO
origin: '*'
origin === 'null'                        // qualquer página file:// consegue fazer request autenticado
origin.endsWith('.railway.app')          // qualquer app no Railway consegue fazer request

// ✅ CORRETO
const ALLOWED_ORIGINS = (process.env.FRONTEND_URL || '').split(',').filter(Boolean);
if (!origin) return callback(null, true);                        // mobile nativo (sem origin header)
if (process.env.NODE_ENV !== 'production') return callback(null, true); // dev local
if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
callback(new Error('CORS: origem não permitida'));
```

Adicionar `RAILWAY_PUBLIC_DOMAIN` explicitamente na lista, nunca como `*.railway.app`.

**5. Security headers — instalar helmet**

```javascript
app.use(helmet({
  contentSecurityPolicy: false,      // desabilitar se usar inline scripts; habilitar com nonces no futuro
  crossOriginEmbedderPolicy: false,  // necessário para recursos externos
}));
```

Helmet ativa automaticamente: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `Referrer-Policy`.

**6. Body limit — nunca deixar o padrão**

```javascript
// ❌ PERIGOSO — facilita DoS por esgotamento de memória
app.use(express.json({ limit: '50mb' }));

// ✅ CORRETO — calcular pelo maior payload legítimo + margem
app.use(express.json({ limit: '5mb' }));        // JSON puro
app.use(express.urlencoded({ limit: '2mb' }));   // forms
```

**7. Upload de arquivo — validar MIME type com multer**

```javascript
// ❌ PERIGOSO — aceita qualquer arquivo
const upload = multer({ dest: 'uploads/' });

// ✅ CORRETO — whitelist por tipo
const uploadImagem = multer({
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    cb(null, allowed.includes(file.mimetype));
  }
});
const uploadJSON = multer({
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = file.mimetype === 'application/json' || file.originalname.endsWith('.json');
    cb(null, ok);
  }
});
```

---

### 🟡 MÉDIO — boas práticas obrigatórias

**8. OTP — usar crypto, nunca Math.random()**

```javascript
// ❌ VULNERÁVEL — pseudoaleatório e determinístico
const otp = Math.floor(100000 + Math.random() * 900000).toString();

// ✅ SEGURO — CSPRNG do Node.js
const crypto = require('crypto');
const otp = crypto.randomInt(100000, 1000000).toString();
```

**9. Error middleware — não vazar stack trace em produção**

```javascript
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    console.error(`${req.method} ${req.path} — ${err.message}`); // sem stack
  } else {
    console.error(err); // stack completo em dev
  }
  res.status(err.status || 500).json({ error: err.message || 'Erro interno' });
});
```

**10. HTML injection em emails — escapar sempre**

```javascript
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
// Usar em todos os campos interpolados em templates HTML de email
const html = `<p>Olá, ${escapeHtml(nomeUsuario)}</p>`;
```

**11. Senhas — bcrypt com mínimo 10 rounds**

```javascript
const hash = await bcrypt.hash(senha, 10);
const ok   = await bcrypt.compare(senhaDigitada, hash);
```

**12. JWT — nunca confiar no payload do cliente**

- Plano, role e permissões: sempre buscar do banco no middleware, nunca ler do JWT sem verificar
- JWT payload pode incluir role como cache, mas decisões de acesso devem ser verificadas server-side
- Expiração mínima: 7d para sessões normais, 15min para tokens de operação sensível (reset de senha)

---

### ✅ O que já estará seguro com Prisma

- **SQL Injection**: Prisma usa queries parametrizadas por padrão — nenhuma query raw necessária para CRUD comum
- **Manipulação client-side**: nunca confiar em dados de gameplay do cliente (XP ganho, vidas, plano) — calcular 100% no servidor

---

## Controle de sessão simultânea (anti-compartilhamento de conta)

Arquitetura para limitar dispositivos por plano — serve tanto como segurança quanto como diferencial de negócio.

### Schema Prisma

```prisma
model sessoes {
  id        Int      @id @default(autoincrement())
  userId    Int
  sessionId String   @unique @default(uuid())  // vai no JWT como "sid"
  plataforma String  // "web", "mobile", "admin"
  ativo     Boolean  @default(true)
  ultimoUso DateTime @default(now())
  inicio    DateTime @default(now())
  fim       DateTime?
  user      users    @relation(fields: [userId], references: [id])
}
```

### JWT payload

```json
{ "userId": 123, "role": "FREE", "sid": "uuid-da-sessao" }
```

### Fluxo de login

```javascript
async function _criarSessao(user, plataforma) {
  const limite = SESSOES_MAX_POR_PLANO[user.role] || 1;
  const ativas = await prisma.sessoes.findMany({
    where: { userId: user.id, ativo: true },
    orderBy: { inicio: 'asc' }
  });

  // Derrubar as mais antigas se exceder o limite
  if (ativas.length >= limite) {
    const paraEncerrar = ativas.slice(0, ativas.length - limite + 1);
    for (const s of paraEncerrar) {
      await prisma.sessoes.update({ where: { id: s.id }, data: { ativo: false, fim: new Date() } });
      enviarWebSocket(user.id, { type: 'sessao_encerrada' }); // avisa o cliente antigo
    }
  }

  const sessao = await prisma.sessoes.create({
    data: { userId: user.id, plataforma, ativo: true }
  });

  const token = jwt.sign(
    { userId: user.id, role: user.role, sid: sessao.sessionId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  return token;
}
```

### authMiddleware com validação de sessão

```javascript
async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Não autenticado' });

  let decoded;
  try { decoded = jwt.verify(token, process.env.JWT_SECRET); }
  catch { return res.status(401).json({ error: 'Token inválido', sessionExpired: true }); }

  // Token antigo sem sid → forçar novo login
  if (!decoded.sid) return res.status(401).json({ error: 'Sessão expirada', sessionExpired: true });

  const sessao = await prisma.sessoes.findFirst({
    where: { sessionId: decoded.sid, ativo: true }
  });
  if (!sessao) return res.status(401).json({ error: 'Sessão encerrada', sessionExpired: true });

  // Atualizar ultimoUso de forma assíncrona (não bloqueia a request)
  prisma.sessoes.update({ where: { id: sessao.id }, data: { ultimoUso: new Date() } }).catch(() => {});

  req.userId = decoded.userId;
  req.role   = decoded.role;
  next();
}
```

### Limites por plano sugeridos

```javascript
const SESSOES_MAX_POR_PLANO = {
  FREE:  1,   // argumento de venda: "quer usar em 2 dispositivos? seja PRO"
  PRO:   2,   // celular + web/tablet
  DEMO:  1,
  ADMIN: 10,
};
```

### Logout — invalidar no banco (não apenas no cliente)

```javascript
// POST /auth/logout
async function logout(req, res) {
  await prisma.sessoes.updateMany({
    where: { userId: req.userId, sessionId: req.sid, ativo: true },
    data: { ativo: false, fim: new Date() }
  });
  res.json({ success: true });
}
```

Cliente trata `sessionExpired: true` em qualquer 401 → limpar token local → tela de login.

---

## Express — armadilhas conhecidas

### Ordem de rotas: literal ANTES de parâmetro dinâmico

```javascript
// ❌ ERRADO — Express captura "respostas-prontas" como valor de :id
router.get('/:id', handler);
router.get('/respostas-prontas', handler); // nunca executado

// ✅ CORRETO — literal sempre primeiro
router.get('/respostas-prontas', handler);
router.get('/:id', handler);
```

### Rate limiter IPv6 no Railway

`ipKeyGenerator` foi **removido no express-rate-limit v7**. Usar função `normalizeIp` manual:

```javascript
// ❌ QUEBRA em produção — ipKeyGenerator não existe no v7
const { ipKeyGenerator } = require('express-rate-limit'); // undefined!
keyGenerator: (req) => ipKeyGenerator(req.ip) // TypeError: ipKeyGenerator is not a function

// ✅ CORRETO — normalizar IPv6-mapped IPv4 manualmente
const normalizeIp = (ip) => {
  if (!ip) return 'unknown';
  if (ip.startsWith('::ffff:')) return ip.slice(7);
  return ip;
};
keyGenerator: (req) => req.userId ? String(req.userId) : normalizeIp(req.ip)
```

### Prisma — nunca usar --force-reset em produção

```bash
# ✅ Para adicionar colunas/tabelas sem perder dados
npx prisma db push

# ❌ DESTRÓI TODOS OS DADOS — só usar em dev/seed local
npx prisma db push --force-reset
```

Se o push falhar por conflito: investigar e resolver manualmente. Nunca forçar.

---

## React Native + Expo — padrões e armadilhas

### Rules of Hooks — NUNCA após early return

```javascript
// ❌ ERRO: "React has detected a change in the order of Hooks called"
function MeuScreen() {
  if (loading) return <Loading />;  // early return ANTES dos hooks
  const [estado, setEstado] = useState(false); // viola a regra
}

// ✅ CORRETO — todos os hooks ANTES de qualquer return condicional
function MeuScreen() {
  const [estado, setEstado] = useState(false);
  useEffect(() => { /* ... */ }, []);

  if (loading) return <Loading />;  // early return DEPOIS dos hooks
  return <View>...</View>;
}
```

### Cache in-memory + AsyncStorage para preservar estado entre navegações

Problema: ao sair e voltar para uma tela, a API pode retornar dados em ordem diferente (ex: spaced repetition), causando reordenação visual do conteúdo.

Solução: variável module-level + inicialização síncrona do useState:

```javascript
// Module level — persiste na sessão JS (não reseta ao navegar)
const _cache = {};

function MeuScreen({ id }) {
  // Lê cache SINCRONAMENTE antes de qualquer useState
  const _saved = _cache[id];

  // Inicializa useState com o cache — mapa abre com estado correto sem flash
  const [itens, setItens] = useState(_saved?.itens || []);
  const [respondidas, setRespondidas] = useState(_saved?.respondidas || {});

  // Ao responder: atualiza cache in-memory + AsyncStorage
  async function handleResponder(itemId, resposta) {
    const novoState = { ...respondidas, [itemId]: resposta };
    setRespondidas(novoState);
    _cache[id] = { itens, respondidas: novoState };
    await AsyncStorage.setItem(`cache_${id}`, JSON.stringify({ ids: itens.map(i => i.id), respondidas: novoState }));
  }

  // Ao finalizar: limpar cache
  async function finalizar() {
    delete _cache[id];
    await AsyncStorage.removeItem(`cache_${id}`);
  }

  // carregarDados: se cache existe, MERGE (mantém ordem, atualiza campos frescos da API)
  async function carregarDados() {
    const dados = await api.get(`/itens/${id}`);
    if (_cache[id]) {
      // Manter ordem do cache, só atualizar campos que mudaram
      const merged = _cache[id].itens.map(cached =>
        dados.find(d => d.id === cached.id) || cached
      );
      setItens(merged);
    } else {
      setItens(dados);
      // Tentar restaurar respondidas do AsyncStorage
      const saved = await AsyncStorage.getItem(`cache_${id}`);
      if (saved) {
        const { respondidas: r } = JSON.parse(saved);
        setRespondidas(r);
        _cache[id] = { itens: dados, respondidas: r };
      }
    }
  }
}
```

### EAS Build — google-services.json

O arquivo `google-services.json` do Firebase não pode ser commitado, mas precisa existir localmente para o build.

**Solução com EAS File Secret:**

1. No painel EAS: adicionar o arquivo como secret do tipo `FILE_BASE64`
2. Criar `mobile/app.config.js` (tem prioridade sobre `app.json`):

```javascript
const baseConfig = require('./app.json');
const config = baseConfig.expo;

module.exports = {
  expo: {
    ...config,
    android: {
      ...config.android,
      // Em build EAS: GOOGLE_SERVICES_JSON é o path do arquivo decodificado do secret
      // Localmente: usa o arquivo local
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || './google-services.json',
    },
  },
};
```

3. `app.json` não deve ter `googleServicesFile` (será sobrescrito pelo `app.config.js`)
4. `.gitignore`: `google-services.json` e `*firebase-adminsdk*.json`

**Atenção:** `app.config.js` é avaliado em tempo de prebuild — variáveis de ambiente do EAS já estão disponíveis nesse momento. Tentar resolver em `app.json` diretamente não funciona (EAS valida o JSON antes de injetar env vars).

### CRLF em shell scripts — obrigatório LF no Linux

Scripts commitados de Windows com CRLF falham silenciosamente em servidores Linux (EAS build servers).

Criar `.gitattributes` na pasta mobile:
```
*.sh text eol=lf
```

Ou evitar shell scripts em hooks EAS — preferir `app.config.js` para lógica de build.

### expo-device e outros módulos nativos

Módulos nativos (que exigem código nativo compilado) requerem rebuild do APK após serem adicionados. Não funcionam com `npx expo start` (Expo Go). Requerem `--dev-client` com APK de desenvolvimento gerado via EAS.

```bash
eas build --platform android --profile development
```

---

## Log de diagnóstico mobile — padrão LGPD

Capturar erros no app para ajudar no suporte, com opt-in explícito do usuário.

### Buffer de erros (logBuffer.js)

```javascript
const _buffer = [];
const MAX = 20;

// Sanitização de PII antes de armazenar
function sanitizar(str) {
  if (!str) return '';
  return String(str)
    .replace(/Bearer\s+[\w.-]+/gi, '[TOKEN]')
    .replace(/eyJ[\w.-]+/g, '[JWT]')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/gi, '[EMAIL]')
    .replace(/\b\d{11}\b/g, '[CPF]')
    .replace(/"senha"\s*:\s*"[^"]*"/gi, '"senha":"[REDACTED]"');
}

function push(entry) {
  if (_buffer.length >= MAX) _buffer.shift();
  _buffer.push({
    ts: new Date().toISOString(),
    tipo: entry.tipo,
    msg: sanitizar(entry.msg),
    stack: sanitizar(entry.stack),
  });
}

export function instalarHandlers() {
  // 1. Crashes JS fatais
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    push({ tipo: isFatal ? 'fatal' : 'error', msg: error.message, stack: error.stack });
  });
  // 2. console.error
  const origError = console.error.bind(console);
  console.error = (...args) => {
    push({ tipo: 'console.error', msg: args.map(String).join(' '), stack: '' });
    origError(...args);
  };
  // 3. Promises rejeitadas
  if (global.addEventListener) {
    global.addEventListener('unhandledrejection', e => {
      push({ tipo: 'unhandledrejection', msg: String(e.reason), stack: e.reason?.stack || '' });
    });
  }
}

export const getLogBuffer = () => [..._buffer];
export const clearLogBuffer = () => { _buffer.length = 0; };
```

Chamar `instalarHandlers()` UMA vez em `App.jsx`, antes de qualquer renderização.

### No formulário de suporte — opt-in explícito

```jsx
// Switch DESLIGADO por padrão (LGPD — consentimento explícito)
const [incluirLog, setIncluirLog] = useState(false);

// Ao enviar chamado
const logDiagnostico = incluirLog ? {
  versaoApp: Constants.expoConfig?.version,
  modelo: Device.modelName,
  so: `${Device.osName} ${Device.osVersion}`,
  erros: getLogBuffer(),
} : null;
```

### Sanitização server-side (segunda camada)

```javascript
function sanitizarLog(log) {
  if (!log || typeof log !== 'object') return null;
  const ALLOWED_FIELDS = ['ts', 'tipo', 'msg', 'stack'];
  const PII_PATTERNS = [
    [/Bearer\s+[\w.-]+/gi, '[TOKEN]'],
    [/eyJ[\w.-]+/g, '[JWT]'],
    [/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, '[EMAIL]'],
    [/\b\d{11}\b/g, '[CPF]'],
    [/"senha"\s*:\s*"[^"]*"/gi, '"senha":"[REDACTED]"'],
  ];

  const redact = (str) => {
    let s = String(str || '');
    for (const [rx, rep] of PII_PATTERNS) s = s.replace(rx, rep);
    return s;
  };

  if (Array.isArray(log.erros)) {
    log.erros = log.erros.slice(0, 20).map(e => {
      const clean = {};
      for (const k of ALLOWED_FIELDS) if (k in e) clean[k] = redact(e[k]);
      return clean;
    });
  }
  return log;
}
```

---

## Deploy Railway — configuração obrigatória para monorepo

Quando o repositório tem subpastas (ex: `backend/`, `mobile/`, `frontend/`), o Railway aponta para a raiz e não encontra o app. Configuração necessária:

| Campo | Valor |
|---|---|
| **Root Directory** | `backend` |
| **Build Command** | `npm run build` → deve ser `prisma generate` no package.json |
| **Start Command** | `node server.js` |

### package.json do backend — scripts obrigatórios para Railway

```json
"scripts": {
  "start": "node server.js",
  "build": "prisma generate"
}
```

**Nunca colocar no `build` um script que referencia path relativo fora do Root Directory** (ex: `node ../scripts/algo.js`) — o Railway muda o working directory para o Root Directory, então `../` não existe.

### Dependências que costumam falhar em produção

Railway usa `npm install --omit=dev` (equivalente a `--production`). Pacotes que parecem "implicitamente disponíveis" no dev mas precisam estar em `dependencies`:

- `dotenv` — frequentemente esquecido por estar no ambiente local
- `prisma` (o CLI) — deve estar em `devDependencies`, mas `@prisma/client` em `dependencies`
- Qualquer pacote que o `server.js` ou seus imports requerem diretamente

### Serviços externos — nunca instanciar no top-level do módulo

```javascript
// ❌ ERRADO — explode no boot se a env var não estiver definida
const resend = new Resend(process.env.RESEND_API_KEY);

// ✅ CORRETO — lazy, não quebra o boot
function getResend() {
  if (!process.env.RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY não configurada — e-mails desabilitados');
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
}

// No uso:
const resend = getResend();
if (!resend) return; // silently skip
```

Aplicar o mesmo padrão para: Stripe, Clicksign, FocusNFE, S3/R2, Firebase Admin, qualquer SDK que exija credencial no construtor.

### Variáveis de ambiente mínimas para o backend subir

```env
NODE_ENV=production
DATABASE_URL=postgresql://...?sslmode=require
JWT_SECRET=<64-chars-hex>
FRONTEND_URL=https://seu-dominio.up.railway.app
```

Sem essas 4, o servidor não sobe corretamente. As demais (`RESEND_API_KEY`, `R2_*`, `CLICKSIGN_*`) podem ser adicionadas depois — desde que os módulos usem instanciação lazy.

---

## Infraestrutura — decisões e trade-offs

### Por que Neon.tech ao invés do PostgreSQL do Railway

| Aspecto | Railway Postgres | Neon.tech |
|---|---|---|
| Connection pooling | Manual (pg-bouncer separado) | PgBouncer embutido na porta 6543 |
| Escalabilidade | Manual | Autoscaling automático |
| Branching de banco | Não | Sim — branch staging grátis no plano Launch |
| SLA | Sem garantia | 99,95% |
| Custo | ~$5/mês | ~$19/mês (Launch) |

> Com Prisma, sem pooler: cada query abre uma conexão. 100 usuários simultâneos já derruba o banco.
> Usar sempre porta 6543 (pooler) do Neon, nunca a 5432 (direta).

### Por que Cloudflare R2 ao invés de S3

- Zero custo de egress (S3 cobra por download — ruinoso com imagens servidas 1000x/dia)
- CDN global incluída automaticamente
- API 100% compatível com S3 — apenas trocar endpoint e credenciais

### Mapa de storage temporário — o que precisa migrar

#### 🔴 Disco local do servidor — some no redeploy (CRÍTICO)

| O que | Onde | Migrar para |
|---|---|---|
| Imagens estáticas (assets, uploads) | `backend/uploads/`, `backend/assets/` | Cloudflare R2 |
| Qualquer arquivo gerado pelo servidor | qualquer path em disco | Cloudflare R2 |

Tudo que é escrito em disco pelo servidor Railway **é perdido a cada deploy**.

#### 🟠 Base64 no banco — infla o PostgreSQL

| Situação | Impacto | Migrar para |
|---|---|---|
| Imagens armazenadas como BYTEA/base64 | Queries lentas, banco inflado | R2 + salvar URL no banco |
| Áudios armazenados como base64 | Idem | R2 + salvar URL no banco |

#### 🟡 AsyncStorage mobile — perdido ao desinstalar

| Chave | Impacto | Solução |
|---|---|---|
| Estado de sessão em andamento | Perda de progresso parcial | Tabela no banco com upsert a cada passo |
| Flag de onboarding concluído | Tutorial reaparece após reinstalação | Campo `onboardingDone` no banco |
| Timers locais | Não sincroniza entre dispositivos | Sincronizar ao concluir sessão |

#### 🟢 In-memory backend — perdido ao reiniciar servidor (aceitável até escala)

| O que | Migrar para (quando necessário) |
|---|---|
| Map de conexões WebSocket | Redis pub/sub |
| Cache de queries | Redis com TTL |

### Scheduler em fuso horário diferente do servidor

Railway roda em UTC. Se o sistema usa horários configurados no fuso local (Brasil):

```javascript
// ✅ Converter UTC → BRT antes de comparar HH:MM
function horaAtualBRT() {
  return new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
}
```

### Ambiente de homologação com Neon Branching

```
prod:    Railway service "app-prod"    → DATABASE_URL = neon branch "main" porta 6543
staging: Railway service "app-staging" → DATABASE_URL = neon branch "staging" porta 6543
```

Branch staging: painel Neon → Branches → New Branch (cópia do schema de prod, dados isolados, grátis no plano Launch).

---

## Sistema de roles e permissões

Padrão testado com múltiplos roles com acesso parcial ao painel admin:

```javascript
// Roles: USER, PRO, ADMIN, SUPORTE, DEMO
// Middlewares separados
const authMiddleware    = require('./auth.middleware');    // valida JWT + sessão
const adminMiddleware   = require('./admin.middleware');   // só ADMIN
const suporteMiddleware = require('./suporte.middleware'); // ADMIN + SUPORTE

// suporte.middleware.js
module.exports = (req, res, next) => {
  if (!['ADMIN', 'SUPORTE'].includes(req.role)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  next();
};

// Uso nas rotas:
router.get('/',       auth, suporte, ctrl.listar);    // ADMIN + SUPORTE
router.delete('/:id', auth, admin,   ctrl.deletar);   // só ADMIN
```

**Bloqueio no login por role:**
- Conta de SUPORTE tentando logar na plataforma principal → mensagem de erro, não deixa entrar
- Conta de SUPORTE no painel admin → redirecionada para a área permitida
- Guard no frontend: `checkAuth()` verifica role e redireciona se necessário

**Usuário DEMO:** exibe tudo igualzinho ao usuário real (nunca suprimir UI por `isDemo`). Diferenças só comportamentais: reset completo no login, sem persistência entre sessões, vidas infinitas.

---

## Sistema de notificações com variáveis e condições

Padrão para notificações push + in-app configuráveis sem código:

### Variáveis de template

Definir `VARIAVEIS_DISPONIVEIS` no serviço de notificações. Admin busca via endpoint e usa no formulário.

```javascript
// notificacoes.service.js
const VARIAVEIS_DISPONIVEIS = [
  { chave: 'nome',              descricao: 'Nome do usuário' },
  { chave: 'dias_inativo',      descricao: 'Dias desde o último acesso' },
  { chave: 'plano',             descricao: 'Plano atual (FREE/PRO)' },
  { chave: 'totp_ativo',        descricao: '2FA ativado? (1=sim, 0=não)' },
  // adicionar conforme o domínio
];

function substituirVariaveis(template, dadosUsuario) {
  return template
    .replace(/\{\{nome\}\}/g, dadosUsuario.nome || '')
    .replace(/\{\{dias_inativo\}\}/g, dadosUsuario.diasInativo || 0)
    .replace(/\{\{plano\}\}/g, dadosUsuario.plano || '')
    .replace(/\{\{totp_ativo\}\}/g, dadosUsuario.totpAtivo ? 1 : 0);
}
```

### Condições de disparo

Schema: `condicao Json?` → `{ variavel, operador, valor }`

```javascript
function avaliarCondicao(condicao, dadosUsuario) {
  if (!condicao) return true; // sem condição = sempre envia
  const { variavel, operador, valor } = condicao;
  const val = dadosUsuario[variavel];
  switch (operador) {
    case '>=': return Number(val) >= Number(valor);
    case '<=': return Number(val) <= Number(valor);
    case '>':  return Number(val) >  Number(valor);
    case '<':  return Number(val) <  Number(valor);
    case '==': return String(val) === String(valor);
    case '!=': return String(val) !== String(valor);
    default:   return false;
  }
}
```

### Push Notifications mobile (Expo)

```javascript
// Registrar token
const { status } = await Notifications.requestPermissionsAsync();
if (status !== 'granted') return;
const token = await Notifications.getExpoPushTokenAsync({ projectId: 'SEU_PROJECT_ID' });
await api.post('/users/push-token', { token: token.data });

// Enviar do backend (Expo Push API)
await fetch('https://exp.host/--/api/v2/push/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: usuario.pushToken,
    title: 'Título',
    body: 'Mensagem',
    data: { tipo: 'alerta' },
  }),
});
```

---

## Dependências — restrições de segurança

### axios — manter em 1.7.9

Versões acima de 1.13.x do axios foram comprometidas com código malicioso injetado no pacote npm (incidente confirmado em 2025).

```json
// package.json — fixar sem ^ ou ~
"axios": "1.7.9"
```

Verificar antes de qualquer `npm install` ou `npm update` que o axios não foi atualizado automaticamente.
Teto máximo permitido se precisar atualizar: `1.13.x`.

---

## Padrão de multi-role no frontend admin

Para um painel admin com roles com acesso parcial:

**login.html:**
```javascript
// Salvar role no localStorage ao logar
localStorage.setItem('admin_role', data.role);
// Redirecionar por role
if (data.role === 'SUPORTE') window.location = 'chamados.html';
else window.location = 'index.html';
```

**admin/js/auth.js — guard em todas as páginas:**
```javascript
function checkAuth() {
  const token = localStorage.getItem('admin_token');
  const role  = localStorage.getItem('admin_role');
  if (!token) { window.location = 'login.html'; return; }

  // SUPORTE só pode acessar chamados.html
  const paginaAtual = window.location.pathname.split('/').pop();
  if (role === 'SUPORTE' && paginaAtual !== 'chamados.html') {
    window.location = 'chamados.html';
  }
}
checkAuth();
```

---

## Filosofia No-Code (admin configurável)

Toda funcionalidade configurável deve ter interface admin correspondente. Nunca deixar o admin dependente de editar código para:
- Textos e copys da plataforma
- Configurações numéricas (limites, timeouts, valores)
- Templates de notificação
- Regras de comportamento (condições de disparo, estados)
- Animações e assets visuais

Padrão: endpoint `GET /admin/config` → `PUT /admin/config` + interface de formulário simples.

---

## Checklist de segurança — antes de ir para produção

```
[ ] .env e chaves privadas no .gitignore (verificar git log --follow)
[ ] JWT_SECRET com mínimo 32 caracteres, nunca "secret" ou "password"
[ ] NODE_ENV=production configurado no Railway
[ ] FRONTEND_URL configurado com os domínios corretos (sem wildcard)
[ ] helmet instalado e ativo
[ ] Rate limiting em /login, /register, /recuperar-senha, /reenviar-verificacao
[ ] WebSocket autentica pelo JWT, não pelo userId
[ ] Body limit configurado (5mb JSON, 2mb urlencoded)
[ ] Multer com fileFilter para uploads
[ ] OTP gerado com crypto.randomInt, não Math.random
[ ] bcrypt com 10 rounds em todas as senhas
[ ] Error middleware não vaza stack trace em produção
[ ] HTML de emails com escapeHtml em todos os campos interpolados
[ ] Logs de diagnóstico sanitizados (sem tokens, email, CPF)
[ ] google-services.json e firebase-adminsdk*.json no .gitignore
[ ] Sessão simultânea controlada (tabela sessoes + sid no JWT)
[ ] Logout invalida sessão no banco (não apenas no cliente)
[ ] Rotas admin protegidas por adminMiddleware separado do authMiddleware
[ ] Verificação de plano/role sempre server-side (nunca confiar no cliente)
```

---

## Variáveis de ambiente obrigatórias (backend)

```env
# Segurança
JWT_SECRET=<string-aleatoria-forte-32-chars-minimo>
NODE_ENV=production

# Banco
DATABASE_URL=postgresql://...?sslmode=require

# CORS — lista separada por vírgula, sem wildcard
FRONTEND_URL=https://seudominio.com,https://admin.seudominio.com

# Email
RESEND_API_KEY=re_...

# Opcionais mas recomendados
ADMIN_TOKEN=<token-para-operacoes-iniciais>
```

Sem `NODE_ENV=production`:
- CORS aceita qualquer origem
- Error middleware loga stack trace completo
- Rate limiting pode se comportar diferente

---

## Erros mapeados e soluções rápidas

| Erro | Causa | Solução |
|---|---|---|
| `ipKeyGenerator is not a function` | `ipKeyGenerator` foi removido no express-rate-limit v7 | Usar `normalizeIp` manual: `const normalizeIp = (ip) => ip?.startsWith('::ffff:') ? ip.slice(7) : (ip \|\| 'unknown')` |
| `React has detected a change in the order of Hooks` | Hook após early return | Mover todos os hooks para antes do primeiro `return` condicional |
| `Cannot find native module 'ExpoDevice'` | Módulo nativo adicionado após último build | Reconstruir APK com `eas build --platform android --profile development` |
| `google-services.json is missing` no EAS Build | Arquivo não resolvido antes do prebuild | Usar `app.config.js` com `process.env.GOOGLE_SERVICES_JSON || './google-services.json'` |
| `ValidationError: app.json` no EAS | Tentativa de usar variável de ambiente diretamente no app.json | Mover para `app.config.js` (JS, avaliado em runtime) |
| Shell script falha silenciosamente no EAS | CRLF em script commitado do Windows | `.gitattributes: *.sh text eol=lf` |
| Rota `/algo-literal` capturada por `/:id` | Ordem incorreta de rotas no Express | Declarar rotas literais ANTES de rotas com parâmetro dinâmico |
| Progresso não persiste ao trocar de dispositivo | AsyncStorage é local por dispositivo | Salvar estado no banco (tabela de estado da sessão) com upsert a cada passo |
| Imagens somem após redeploy | Disco local do Railway é efêmero | Migrar para Cloudflare R2 |
| Onboarding reaparece após reinstalação | Flag em AsyncStorage/localStorage | Salvar flag `onboardingDone` no banco (campo em `users`) |
| WebSocket desconecta todos ao reiniciar | Mapa de clients em memória | Redis pub/sub para multi-instância |
| Timer de estudo diverge entre dispositivos | Timer local não sincroniza | Sincronizar com banco ao concluir cada sessão |
| `Math.random()` para OTP | Pseudoaleatório — previsível | `crypto.randomInt(100000, 1000000).toString()` |
| HTML injection em emails | Interpolação direta sem escape | `escapeHtml()` em todos os campos de template HTML |
| `Railpack could not determine how to build the app` no Railway | Railway aponta para a raiz do repo, mas o backend está em subpasta | Definir **Root Directory = `backend`** nas Settings do serviço Railway |
| `Cannot find module '../scripts/build-frontend.js'` no Railway | Script de build aponta para path relativo fora do Root Directory | O backend Node.js não precisa de build do frontend; usar `"build": "prisma generate"` no package.json |
| `Cannot find module 'dotenv'` no Railway | `dotenv` estava ausente de `dependencies` (só funcionava localmente pois estava instalado globalmente) | Adicionar `dotenv` explicitamente em `dependencies` no package.json — em produção Railway usa `--omit=dev` |
| `Missing API key. Pass it to the constructor new Resend(...)` | `new Resend(process.env.RESEND_API_KEY)` chamado na raiz do módulo — explode no boot se a env var não estiver definida | Instanciar serviços externos de forma lazy (dentro de uma função `getResend()`) e retornar `null` com `logger.warn` se a key não estiver configurada — nunca instanciar no top-level do módulo |
