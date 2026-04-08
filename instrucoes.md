O que é o Sistema?
O EncontraMed é uma plataforma SaaS B2B de logística e escalonamento médico. Ele resolve o problema de hospitais e clínicas que precisam encontrar médicos (PJ) para cobrir plantões ou preencher escalas fixas, utilizando geolocalização e filtros de especialidade.

1. Fontes de Dados Públicos e Integração
Para um sistema médico, a confiança vem da validação. Você buscará dados de duas formas:

A. CFM / Portal da Transparência (Validação de CRM)
O que buscar: Nome do médico, situação do registro (Ativo/Inativo) e especialidades registradas (RQE).

Método: O CFM não possui uma API pública aberta para terceiros de fácil acesso.

Abordagem: Scraper via Puppeteer ou Playwright. O robô acessa a busca do CFM, insere o CRM/UF e extrai o status.

Uso no Sistema: Validar o médico no momento do cadastro e disparar um alerta se o CRM for suspenso.

B. CNES (Cadastro Nacional de Estabelecimentos de Saúde)
O que buscar: Dados dos hospitais, endereços, capacidade instalada e gestores.

Método: API do Barramento do SUS (Datasus) ou download das bases mensais (arquivos .csv ou .dbf) para ingestão em massa no seu banco.

Uso no Sistema: Preencher automaticamente os dados do hospital no cadastro via CNPJ, economizando tempo do usuário.

C. API de Geolocalização (OpenStreetMap/Nominaltim)
Método: API. Como você descartou o GCP Storage, assumo que quer evitar dependência excessiva da Google. O OpenStreetMap (via biblioteca leaflet ou react-native-maps) permite geocodificar endereços sem custo abusivo.

2. Funcionalidades Detalhadas (Roadmap de Desenvolvimento)
Aqui está a lista lógica para o Claude Code gerar as rotas e regras:

Módulo 01: O "Marketplace" de Plantões
Filtros Inteligentes: O sistema não mostra tudo; ele filtra por Especialidade vs. RQE do médico.

Sistema de "Bid" (Opcional): O hospital posta um valor base, e médicos podem aceitar ou fazer uma contraproposta (útil para plantões de última hora/feriados).

Push Condicional: Notificar primeiro os médicos que moram a menos de 20km do hospital (economia de deslocamento e rapidez).

Módulo 02: Gestão de Escala B2B
Troca de Plantão: Funcionalidade onde um médico "vende" ou "troca" seu horário com outro, mas o Hospital precisa dar o "De acordo" final no app.

Escala Fixa vs. Spot: Suporte para contratos de longo prazo (toda terça-feira) e plantões avulsos (preciso de alguém agora).

Módulo 03: Compliance e Documentos
OCR de Documentos: O médico tira foto do CRM e diploma. (Como não usará GCS, você pode processar isso via Tesseract.js no Node para extrair o texto e validar os números antes de salvar o arquivo no seu Storage escolhido).

Assinatura Digital: Integração para assinatura de contrato de prestação de serviço PJ (via API da Clicksign ou similar) assim que o médico aceita o primeiro plantão.

Módulo 04: Financeiro (O "Derruba-Muralhas")
Extrato de Produção: O médico visualiza quanto tem a receber no mês.

Emissão de Nota: Interface que prepara os dados para o médico emitir a NF (ou integra com APIs de nota fiscal como a FocusNFE ou PlugNotas).

3. Resumo para o Claude Code (Prompt de Contexto)
Ao iniciar o chat com o Claude, mande este bloco:

"Claude, atue como Arquiteto de Software. O EncontraMed é um SaaS de logística médica.

Core Engine:

Preciso de um motor de busca geoespacial que relacione a Table_Hospital e Table_Doctor num raio variável.

Implemente a lógica de 'Status de Plantão': Aberto -> Candidatado -> Confirmado -> Realizado -> Pago.

Crie uma estrutura de Scraper (exemplo funcional com Playwright) para consultar o status de um CRM no portal do CFM.

Desenvolva o módulo de Escalas, permitindo que um hospital gere recorrências (ex: todas as segundas-feiras por 6 meses).

Regra de Negócio Crítica: Um médico só pode se candidatar a plantões se o seu RQE (Registro de Qualificação de Especialista) bater com a especialidade exigida pelo hospital."