# EncontraMed — Roteiro Completo de Testes

> Guia para testar todas as funcionalidades desenvolvidas na plataforma.
> Cobre: Admin Web · Portal Hospital Web · App Médico (Mobile).

---

## Índice

1. [Configuração do Ambiente](#1-configuração-do-ambiente)
2. [Fluxo Completo — Visão Geral](#2-fluxo-completo--visão-geral)
3. [Admin Web](#3-admin-web)
4. [Portal Hospital Web](#4-portal-hospital-web)
5. [App Médico (Mobile)](#5-app-médico-mobile)
6. [Funcionalidades em Tempo Real](#6-funcionalidades-em-tempo-real)
7. [Fluxo Integrado Ponta a Ponta](#7-fluxo-integrado-ponta-a-ponta)

---

## 1. Configuração do Ambiente

### Backend (local)

```bash
cd backend
cp .env.example .env   # preencher DATABASE_URL e JWT_SECRET
npm install --legacy-peer-deps
npx prisma db push
node server.js
# Servidor sobe em http://localhost:3000
```

### Mobile (Expo Go)

```bash
cd mobile
npm install --legacy-peer-deps
npx expo start
# Escanear QR com Expo Go (Android/iOS)
# EXPO_PUBLIC_API_URL deve apontar para o IP local: http://192.168.x.x:3000/api
```

### Portais Web

Abrir diretamente no navegador:
- **Admin:** `http://localhost:3000/admin/login.html`
- **Hospital:** `http://localhost:3000/hospital/login.html`

Em produção (Railway), substituir `localhost:3000` pela URL do serviço.

### Usuários de teste — criar via registro

| Role | Como criar | Observação |
|---|---|---|
| Médico | App mobile → tela de registro | Preencher CRM (qualquer número em dev) |
| Hospital | Portal hospital → tela de registro | Preencher CNPJ (14 dígitos) |
| Admin | Inserção direta no banco ou seed | `role = 'ADMIN'` na tabela `usuarios` |

---

## 2. Fluxo Completo — Visão Geral

```
Hospital cria plantão
       ↓
Médicos próximos recebem notificação (WebSocket + push)
       ↓
Médico visualiza no app e se candidata
       ↓
Hospital aceita candidatura no portal web
       ↓
Status → CONFIRMADO
       ↓
Contrato PDF gerado automaticamente
       ↓
Ambas as partes aceitam o contrato (1 clique)
       ↓
Plantão realizado → status → REALIZADO
       ↓
Ambas as partes avaliam (1–5 estrelas)
       ↓
Nota média atualizada no perfil de cada um
```

---

## 3. Admin Web

**URL:** `/admin/login.html`

### 3.1 Login

| Campo | Valor |
|---|---|
| E-mail | e-mail do usuário admin |
| Senha | senha cadastrada |

**Resultado esperado:** redireciona para `dashboard.html`. Se o role for `SUPORTE`, redireciona para `chamados.html`.

---

### 3.2 Dashboard (`dashboard.html`)

**O que ver:**
- Cards com totais: usuários, médicos, hospitais, plantões ativos
- Gráfico de atividade recente (se houver dados)

**Como testar:** acessar após cadastrar ao menos 1 médico e 1 hospital. Os contadores devem refletir os registros.

---

### 3.3 Médicos (`medicos.html`)

**O que ver:**
- Tabela com colunas: Médico · CRM/UF · Status CRM · **Nota** · Cadastrado · Ações

**Como testar:**

1. Abrir a página — lista todos os médicos cadastrados
2. Usar o campo de busca (nome ou e-mail) e clicar **Buscar**
3. Filtrar por **Status CRM** (Ativo / Não Verificado / Suspenso)
4. Clicar **🔍 CRM** em um médico que tem CRM preenchido
   - **Resultado esperado:** dispara revalidação no `consultacrm.com.br` (requer `CONSULTACRM_KEY` em produção; em dev retorna 503 por design)
5. Clicar **⛔ Suspender** — conta do médico bloqueada; login retorna erro
6. Clicar **✅ Ativar** — conta reativada

**Coluna Nota:**
- Antes de qualquer avaliação: exibe `—`
- Após o médico ser avaliado por um hospital: exibe `⭐ 4.5 (2)` (nota média e total)

---

### 3.4 Hospitais (`hospitais.html`)

**O que ver:**
- Tabela: Hospital · CNPJ · CNES · **Nota** · Verificado · Cadastrado · Ações

**Como testar:**

1. Filtrar por "Não verificados" — aparecem hospitais recém-cadastrados
2. Clicar **✅ Verificar** em um hospital pendente
   - **Resultado esperado:** badge muda para `✓ Verificado`; hospital pode criar plantões sem restrição
3. Clicar **⛔** para suspender o hospital
4. Coluna **Nota:** igual ao médico — exibe `—` até haver avaliações

---

### 3.5 Plantões (`plantoes.html`)

**O que ver:** todos os plantões da plataforma, de todos os hospitais.

**Como testar:**

1. Usar filtro de status (Aberto / Confirmado / Realizado / Cancelado)
2. Verificar IDs e datas dos plantões criados pelo hospital

---

### 3.6 Candidaturas (`candidaturas.html` — admin)

**O que ver:** todas as candidaturas da plataforma.

**Como testar:** criar uma candidatura no app mobile e confirmar que aparece aqui com status `PENDENTE`.

---

### 3.7 Chamados (`chamados.html`)

**O que ver:** chamados de suporte abertos por médicos/hospitais.

**Como testar:**

1. No app mobile → aba **Perfil** → **Suporte** → abrir um chamado
2. Acessar `chamados.html` — o chamado aparece com status `ABERTO`
3. Clicar no chamado → ver detalhes e log de diagnóstico (se o usuário optou por incluir)
4. Marcar como resolvido → status muda para `RESOLVIDO`

> Acesso ao chamados.html é permitido também para role `SUPORTE` (sem acesso às demais páginas).

---

### 3.8 Especialidades (`especialidades.html`)

**O que ver:** lista de especialidades médicas disponíveis para seleção no formulário de plantão.

**Como testar:**

1. Criar nova especialidade → aparece no dropdown do formulário de plantão
2. Editar nome
3. Desativar → some do dropdown (mas não é excluída)

---

### 3.9 Notificações (`plantoes.html` admin ou notificações)

**Como testar:**

1. Criar uma notificação com template usando `{{nome}}` e `{{dias_inativo}}`
2. Definir condição: ex. `dias_inativo >= 7`
3. Disparar manualmente
   - **Resultado esperado:** notificação enviada apenas para usuários que satisfazem a condição

---

### 3.10 Config (`config.html`)

**O que ver:** configurações gerais da plataforma (textos, limites, etc).

**Como testar:** alterar um valor, salvar, recarregar → valor persiste.

---

## 4. Portal Hospital Web

**URL:** `/hospital/login.html`

### 4.1 Login / Registro

**Registro:**
1. Acessar `/hospital/login.html` → clicar **Criar conta**
2. Preencher: e-mail, senha, razão social, CNPJ (14 dígitos), telefone
3. **Resultado esperado:** conta criada com status `NAO_VERIFICADO`; login funciona; funcionalidades disponíveis mas hospital aparece como "Pendente" no admin até ser verificado

**Login:**
- E-mail + senha → redireciona para `dashboard.html`

---

### 4.2 Dashboard (`dashboard.html`)

**O que ver:**
- Plantões ativos, candidatos pendentes, plantões confirmados este mês
- Acesso rápido às seções principais

---

### 4.3 Plantões (`plantoes.html`)

#### Criar plantão simples

1. Clicar **+ Novo Plantão**
2. Preencher:
   - **Título** (ex: "Plantão UTI — 12h noturno")
   - **Especialidade** (dropdown populado da API)
   - **Data/Hora Início** e **Data/Hora Fim** → duração calculada automaticamente
   - **CEP** (ex: 01310-100) → aguardar 400ms → cidade/UF preenchidos automaticamente via ViaCEP
   - **Local/Nome** (pode manter o logradouro ou editar)
   - **Tipo de Remuneração:** Valor Fixo ou Valor por Hora
   - **Valor** → se "por hora", preview do total estimado aparece abaixo
   - Opções: Exige RQE / Aceitar propostas (bid) / **Urgente**
   - Se bid marcado: campo "Valor Mínimo de Proposta" aparece
   - **Descrição/Observações** (opcional)
3. Clicar **Criar Plantão**
   - **Resultado esperado:** plantão aparece na tabela com status `ABERTO`; médicos próximos recebem notificação via WebSocket

#### Criar plantão recorrente

1. No mesmo formulário, rolar até **Recorrência**
2. Marcar **"Este é um plantão recorrente"**
3. Selecionar tipo:
   - **Semanal:** selecionar dias da semana clicando nos botões circulares (Dom/Seg/.../Sáb — ficam azuis quando selecionados)
   - **Diária:** sem seleção de dias
   - **Mensal:** repete no mesmo dia do mês
4. Selecionar **Repetir até** (data limite)
5. Clicar **Criar Plantão**
   - **Resultado esperado:** múltiplos plantões criados (um por ocorrência, até 52 máximo); todos aparecem na tabela

#### Filtrar plantões

- Usar o select de status no topo direito (Todos / Aberto / Candidatado / Confirmado / Realizado / Cancelado)

#### Cancelar plantão

- Clicar **Cancelar** na linha (disponível apenas para status `ABERTO`)
- Confirmar no modal
- **Resultado esperado:** status muda para `CANCELADO`; candidatos são notificados

#### Abrir chat

- Clicar **💬 Chat** em qualquer linha
- Modal de chat abre → trocar mensagens com o médico candidato

#### Ver e aceitar contrato (plantão CONFIRMADO)

1. Aceitar uma candidatura (em `candidaturas.html`) → plantão fica `CONFIRMADO`
2. Voltar para `plantoes.html` → linha do plantão agora mostra botão **📄 Contrato**
3. Clicar **📄 Contrato**
4. Modal abre com status: `⏳ Aguardando Assinatura` ou `✔ Contrato Assinado`
5. Se pendente, clicar **✔ Aceitar Contrato**
   - **Resultado esperado:** status muda para `Assinado`; data/hora registradas no banco
6. Clicar **📄 Ver PDF** → PDF abre em nova aba com:
   - Dados do hospital (CNPJ, CNES) e do médico (CRM, CPF)
   - Dados do plantão (data, duração, valor)
   - Seção **"DA VALIDADE JURÍDICA DO ACEITE ELETRÔNICO"** com citação dos artigos da Lei 14.063/2020
   - Se assinado: selo verde com data/hora, IP e número de protocolo `ENM-{id}-{timestamp}`
   - Se pendente: aviso laranja

---

### 4.4 Candidaturas (`candidaturas.html`)

**O que ver:** todos os médicos que se candidataram aos plantões do hospital.

**Como testar:**

1. Garantir que um médico se candidatou (via app mobile)
2. Acessar a página — candidatura aparece com status `PENDENTE`
3. Clicar **✅ Aceitar**
   - **Resultado esperado:** candidatura vira `ACEITO`; plantão vira `CONFIRMADO`; médico recebe notificação
4. Clicar **❌ Recusar**
   - **Resultado esperado:** candidatura vira `RECUSADO`
5. Clicar **💬 Chat** na linha da candidatura → abrir conversa com o médico

**Proposta de valor (bid):**
- Se o plantão aceita bid: candidatura pode vir com `valorProposto` preenchido
- Exibido na coluna de valor da candidatura

---

### 4.5 Perfil (`perfil.html`)

**Como testar:**

1. Editar nome fantasia, telefone, endereço
2. Salvar → recarregar → dados persistem
3. Verificar se CNES aparece (preenchido no cadastro ou pela validação CRM)

---

## 5. App Médico (Mobile)

### 5.1 Registro e Login (`LoginScreen` / `RegisterScreen`)

**Registro:**
1. Abrir app → **Criar conta**
2. Preencher: nome, e-mail, senha, CRM, UF do CRM, CPF
3. **Resultado esperado:** conta criada → login automático → tela inicial
4. Em produção com `CONSULTACRM_KEY`: CRM é validado em `consultacrm.com.br`; sem a chave, CRM fica `NAO_VERIFICADO` (graceful degradation)

**Login:**
- E-mail + senha → token JWT salvo no SecureStore

---

### 5.2 Home — Plantões Disponíveis (`HomeScreen`)

**O que ver:** lista de plantões abertos, ordenados por distância/data.

**Como testar:**

1. **Filtro por raio:** clicar nos botões `20 km · 50 km · 100 km · 200 km`
   - **Resultado esperado:** lista atualiza com plantões dentro do raio selecionado (requer permissão de localização)

2. **Localização:** ao conceder permissão de GPS, cada PlantaoCard mostra distância aproximada

3. **Pull to refresh:** puxar a lista para baixo → recarrega da API

4. **Ampliar busca:** quando lista vazia, clicar "Ampliar busca" → muda raio para 200 km

5. **Banner urgente:** quando um hospital cria um plantão marcado como "Urgente":
   - Banner vermelho aparece no topo: `⚡ Plantão URGENTE próximo!`
   - Tocar no banner → navega para detalhes do plantão
   - Tocar no **×** → dispensa o banner

6. **Notificação de sino:** ícone no canto superior direito
   - Se há notificações não lidas: ícone amarelo/destaque com badge numérico
   - Tocar → abre lista de notificações

---

### 5.3 Detalhe do Plantão (`PlantaoDetailScreen`)

**Como acessar:** tocar em qualquer card na Home.

**O que ver:**
- Card de cabeçalho: título, especialidade, valor (e total estimado se por hora), status badge
- Detalhes: data, horário, duração, local, exige RQE, aceita propostas
- Descrição (se preenchida)
- Card do Hospital: nome fantasia, cidade/UF, **tipo de estabelecimento**, **CNES**, telefone

**Candidatura simples (plantão ABERTO):**

1. Tocar **Candidatar-me**
2. **Resultado esperado:** candidatura enviada → app navega para Chat do plantão (para continuar a conversa com o hospital)

**Candidatura com proposta de valor (bid):**

1. Plantão deve ter "Aceita propostas" habilitado
2. Tocar **Fazer contraproposta de valor** → campo de valor aparece
3. Digitar valor (ex: `350,00`) → tocar **Enviar proposta**
4. **Resultado esperado:** proposta enviada com o valor digitado → navega para Chat

**Plantão CONFIRMADO:**
- Botão **Abrir chat** → conversa com hospital
- Botão **Ver contrato** → `ContratoScreen`

**Plantão REALIZADO ou PAGO:**
- Botão **Avaliar este plantão** → `AvaliacaoScreen`

---

### 5.4 Meus Plantões (`MeusPlantoesScreen`)

**O que ver:** plantões em que o médico está candidatado ou confirmado.

**Como testar:**

1. Candidatar-se a um plantão
2. Acessar aba **Plantões** na barra inferior
3. **Resultado esperado:** plantão aparece com status `CANDIDATADO`
4. Após o hospital aceitar: status muda para `CONFIRMADO`

---

### 5.5 Carteira (`WalletScreen`)

**Acesso:** aba **Carteira** na barra inferior.

**Abas disponíveis:**

**Resumo:**
- Total recebido (acumulado de plantões com status `PAGO`)
- Total de plantões realizados
- Valor a receber (plantões `CONFIRMADO` ou `REALIZADO` ainda não pagos)
- Nota média com estrela (ex: `⭐ 4.8`)

**A receber:**
- Lista de plantões futuros/confirmados com valor e data

**Histórico:**
- Lista de plantões pagos com valor e data

**Como testar:**

1. Com médico sem nenhum plantão: todas as métricas mostram zero/`—`
2. Após um plantão ser marcado como `PAGO` (via admin ou API): valor aparece no histórico e total recebido

---

### 5.6 Chat (`ChatScreen`)

**Acesso:** botão **Chat** na barra superior do detalhe do plantão, ou após candidatura.

**Como testar:**

1. Médico envia mensagem
2. Hospital vê a mensagem no portal web (modal de chat em `plantoes.html` ou `candidaturas.html`)
3. Hospital responde → médico vê a resposta (pull to refresh ou WebSocket)

**Atalho:** `Ctrl+Enter` (web) envia a mensagem.

---

### 5.7 Contrato (`ContratoScreen`)

**Acesso:** Meus Plantões → plantão CONFIRMADO → **Ver contrato**.

**O que ver:**
- Status: `PENDENTE_ASSINATURA` ou `ASSINADO`
- Se pendente: botão **Aceitar com 1 clique**

**Como testar:**

1. Plantão deve estar `CONFIRMADO`
2. Acessar ContratoScreen
3. Tocar **Aceitar com 1 clique** → Alert de confirmação aparece
4. Confirmar → POST enviado para `/api/contratos/:plantaoId/aceitar`
5. **Resultado esperado:** status muda para `ASSINADO`; toast de sucesso
6. Tocar **Visualizar PDF** → abre PDF no navegador do dispositivo
   - PDF contém: dados das partes, plantão, valor, seção Lei 14.063/2020 com artigos citados
   - Se assinado: selo verde com protocolo `ENM-{id}-{timestamp}`

---

### 5.8 Avaliação (`AvaliacaoScreen`)

**Acesso:** Meus Plantões → plantão REALIZADO ou PAGO → **Avaliar este plantão**.

**Como testar:**

1. Tocar nas estrelas (1 a 5) — estrelas ficam preenchidas até a nota selecionada
2. Escrever comentário (opcional)
3. Tocar **Enviar Avaliação**
4. **Resultado esperado:**
   - Avaliação salva no banco
   - `notaMedia` e `totalAvaliacoes` do hospital atualizados
   - No admin (`hospitais.html`): coluna **Nota** exibe `⭐ X.X (N)`
   - Não é possível avaliar o mesmo plantão duas vezes pelo mesmo usuário

**Avaliação mútua:** o hospital também avalia o médico (via portal web ou admin). A nota do médico aparece em `admin/medicos.html`.

---

### 5.9 Notificações (`NotificacoesScreen`)

**Acesso:** ícone de sino na Home.

**Como testar:**

1. Hospital cria um plantão → notificação "Novo plantão disponível" aparece na lista
2. Hospital aceita candidatura → notificação "Sua candidatura foi aceita"
3. Tocar na notificação → marca como lida; badge do sino decrementa
4. Tocar **Marcar todas como lidas** → badge some

---

### 5.10 Perfil (`PerfilScreen`)

**Como testar:**

1. Editar nome, telefone, CPF, especialidades
2. Ver CRM e status de validação
3. Botão **Suporte** → `SuporteScreen`

---

### 5.11 Suporte (`SuporteScreen`)

**Como testar:**

1. Escrever descrição do problema
2. Toggle **"Incluir log de diagnóstico"** (desligado por padrão — LGPD)
   - Ligar → anexa os últimos 20 erros capturados pelo app (sem tokens, e-mails ou CPFs)
3. Tocar **Enviar** → chamado criado
4. **Resultado esperado:** chamado aparece em `admin/chamados.html`

---

## 6. Funcionalidades em Tempo Real

### WebSocket — Novo plantão urgente

**Setup:** abrir o app mobile (médico logado) e o portal hospital (hospital logado) simultaneamente.

**Teste:**

1. No portal hospital → criar plantão com **Urgente** marcado
2. No app mobile (sem recarregar):
   - Banner vermelho `⚡ Plantão URGENTE próximo!` aparece no topo da Home
   - Lista de plantões atualiza automaticamente
3. Tocar no banner → navega para o detalhe
4. Tocar no **×** → dispensa o banner

**Plantão não-urgente:**
- Lista atualiza automaticamente
- Sem banner

---

### WebSocket — Sessão simultânea

Se o mesmo usuário logar em um segundo dispositivo além do limite do plano:
- Primeiro dispositivo recebe evento `sessao_encerrada`
- App exibe aviso e redireciona para tela de login

---

## 7. Fluxo Integrado Ponta a Ponta

Roteiro completo simulando um uso real da plataforma:

### Passo 1 — Cadastro
- [ ] Cadastrar 1 hospital no portal web
- [ ] Cadastrar 1 médico no app mobile
- [ ] Admin verificar o hospital (`admin/hospitais.html` → ✅ Verificar)

### Passo 2 — Publicar plantão
- [ ] Hospital → `plantoes.html` → **+ Novo Plantão**
- [ ] Preencher CEP → verificar preenchimento automático de cidade/UF
- [ ] Marcar **Urgente** e **Aceitar propostas**
- [ ] Definir valor mínimo de proposta
- [ ] Salvar
- [ ] **Verificar:** plantão aparece na tabela com status `ABERTO`

### Passo 3 — Médico recebe notificação
- [ ] No app: banner urgente aparece na Home
- [ ] Abrir detalhe do plantão
- [ ] Verificar dados do hospital: tipo de estabelecimento + CNES
- [ ] Candidatar-se (valor fixo ou proposta)
- [ ] **Verificar:** app navega para Chat

### Passo 4 — Hospital aceita candidatura
- [ ] Portal hospital → `candidaturas.html`
- [ ] Candidatura aparece com status `PENDENTE`
- [ ] Clicar **✅ Aceitar**
- [ ] **Verificar:** status → `ACEITO`; plantão → `CONFIRMADO`

### Passo 5 — Assinatura do contrato
- [ ] Portal hospital → `plantoes.html` → plantão CONFIRMADO → **📄 Contrato**
- [ ] Modal abre com status `⏳ Aguardando Assinatura`
- [ ] Clicar **✔ Aceitar Contrato**
- [ ] **Verificar:** status → `Assinado`; clicar **📄 Ver PDF** → PDF com selo verde
- [ ] No app mobile → Meus Plantões → **Ver contrato** → **Aceitar com 1 clique**
- [ ] **Verificar:** ambas as partes com aceite registrado

### Passo 6 — Após o plantão
- [ ] Admin ou API: mudar status do plantão para `REALIZADO`
- [ ] No app: Meus Plantões → **Avaliar este plantão**
- [ ] Dar 5 estrelas e comentário
- [ ] **Verificar:** `admin/medicos.html` → coluna Nota atualizada
- [ ] Hospital avalia o médico (via portal)
- [ ] **Verificar:** `admin/hospitais.html` → coluna Nota atualizada

### Passo 7 — Carteira
- [ ] Admin: mudar status para `PAGO`
- [ ] No app → aba **Carteira** → aba **Histórico**
- [ ] **Verificar:** plantão aparece no histórico com valor; total recebido atualizado

---

## Notas de comportamento esperado

| Situação | Comportamento |
|---|---|
| `CONSULTACRM_KEY` não configurada | CRM fica `NAO_VERIFICADO`; médico pode usar o app normalmente |
| `RESEND_API_KEY` não configurada | E-mails não são enviados; verificação de e-mail é pulada automaticamente |
| Hospital não verificado | Pode criar plantões; aparece como "Pendente" no admin |
| Plantão urgente + raio 20 km | Banner vermelho no topo da Home; médicos no raio recebem push |
| Plantão não-urgente | Notificação push apenas; lista atualiza via WebSocket sem banner |
| Bid sem `valorMinimoBid` | Campo aceita qualquer valor acima de zero |
| Avaliação duplicada | API retorna erro 409; app exibe toast de erro |
| Plantão recorrente | Cria o plantão pai + N filhos (até 52); cada um é independente |
| PDF sem assinatura | Aviso laranja no rodapé; botão "Aceitar" disponível |
| PDF assinado | Selo verde com data/hora/IP/protocolo no rodapé |
| Sessão expirada (JWT) | App/portal exibe tela de login; token removido do storage |
