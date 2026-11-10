# DESAFIOS REAIS
## Product & Technology Brief — Master Project Specification

**Versão:** 1.1  
**Mercado inicial:** Brasil  
**Idioma da plataforma:** Português brasileiro  
**Categoria:** Competitive Entertainment Platform  
**Modelo:** Digital Platform + Physical Experiences + Events + Community

---

# 1. VISÃO GERAL DO PROJETO

DESAFIOS REAIS é uma plataforma de entretenimento competitivo que conecta pessoas, influenciadores, atletas, organizadores, marcas e espaços físicos por meio de desafios esportivos e recreativos.

O conceito central é conectar o mundo digital ao mundo real.

Através da plataforma, qualquer pessoa poderá descobrir desafios, desafiar outras pessoas, participar de competições, acompanhar resultados, consultar rankings e encontrar eventos presenciais.

A plataforma também permitirá que influenciadores e organizadores criem desafios, mobilizem suas comunidades e transformem competições em experiências presenciais e conteúdo digital.

Não queremos construir apenas um site de karting.

Queremos construir um ecossistema de entretenimento competitivo que possa crescer nacionalmente e incorporar diferentes modalidades esportivas e recreativas.

**Brand positioning:**

DESAFIOS REAIS

O SEU DESAFIO. A SUA HISTÓRIA.

DESAFIE. COMPITA. VENÇA.

# 1A. MVP SCOPE LOCK (v1.1)

Regra de produto (decisão 1C): a **arquitetura** nasce multi-arena e multi-modalidade; o **lançamento** é restrito a uma arena e duas modalidades.

### Entra no MVP

- 1 arena: Super Mountain Kart.
- Modalidades ativas: Super Mountain Kart e Gravity Kart.
- Landing / home de marketing, autenticação, perfis básicos.
- Criação e publicação de desafios (com aprovação quando necessário).
- Marketplace de desafios (filtros essenciais).
- Convites, inscrições, calendário pessoal.
- Reservas de baterias / experiências na arena.
- Pagamentos comerciais via Mercado Pago (inscrições, reservas, pacotes).
- Check-in operacional, registro de resultados validados.
- Ranking básico por modalidade (e geral seed).
- Painel administrativo mínimo.
- Design system dark motorsport (tokens + componentes essenciais).
- Web responsiva mobile-first (Next.js).

### Fica fora do MVP (arquitetura preparada, UI/fluxo desligado)

- UI multi-arena e cadastro self-serve de novas arenas.
- Modalidades adicionais (sinuca, ciclismo, corrida, etc.) além do seed inativo.
- Flutter app.
- Gamificação rica (níveis complexos, medalhas avançadas).
- Seguidores / growth engine completo de influenciadores.
- Transmissões ao vivo e DR Media avançado.
- Patrocínios self-serve.
- Apostas P2P, carteira de apostas, poços, comissão sobre desafios monetários.
- Microserviços.

### Princípio

Projetar tabelas, IDs e APIs para N arenas e N modalidades desde o dia 1. No MVP, seed e feature flags expõem apenas SMK + kart/gravity.

# 2. MODELO DE NEGÓCIO

O negócio possui três pilares integrados.

### A. DIGITAL PLATFORM — DR CHALLENGES

Uma plataforma digital onde usuários podem:

- Descobrir desafios.
- Criar desafios.
- Desafiar outros participantes.
- Aceitar convites.
- Participar de competições.
- Consultar calendários.
- Reservar vagas em eventos.
- Acompanhar resultados.
- Consultar rankings.
- Compartilhar suas conquistas.
- Seguir atletas e influenciadores (pós-MVP / Fase 4).

### B. PHYSICAL EXPERIENCES — DR ARENA

A primeira unidade física será o complexo Super Mountain Kart, instalado em uma fazenda brasileira.

O complexo terá:

**Super Mountain Kart**
- Circuito aproximado de 2 km.
- Karts elétricos.
- Curvas ascendentes e descendentes.
- Retas para ultrapassagens.
- Competições recreativas e organizadas.

**Gravity Kart**
- Veículos sem propulsão própria.
- Competições de descida.
- Baterias com vários participantes.

**Outras modalidades (modelo preparado, não ativas no MVP)**
- Sinuca.
- Ciclismo.
- Corrida.
- Futuras modalidades esportivas e recreativas.

**DR Lounge**
- Restaurante e lanchonete.
- Mesas de sinuca.
- Playground infantil.
- Área de convivência.
- Espaço para acompanhantes.
- Eventos e experiências corporativas.

A plataforma deverá permitir que outras arenas e organizadores sejam cadastrados futuramente (sem rebuild). No MVP, apenas SMK está publicada.

### C. MEDIA & EVENTS — DR EVENTS

A plataforma também será utilizada para organizar:

- Desafios entre influenciadores.
- Campeonatos.
- Eventos esportivos.
- Eventos corporativos.
- Competições patrocinadas.
- Conteúdos audiovisuais.
- Transmissões e cobertura de eventos.

O objetivo é transformar os desafios em conteúdo compartilhável, atraindo novos usuários e movimentando as arenas físicas.

No MVP: páginas públicas de desafio + compartilhamento básico. Media/transmissões avançadas ficam para fases posteriores.

# 3. ARQUITETURA DA MARCA

A marca principal é DESAFIOS REAIS.

Submarcas:

- DR ARENA — espaços físicos e experiências.
- DR KART — competições de kart.
- DR GRAVITY — Gravity Kart.
- DR CHALLENGES — plataforma digital.
- DR EVENTS — eventos e campeonatos.
- DR MEDIA — conteúdo e influenciadores.

A identidade visual deverá seguir o Brand Bible (quando disponível no repositório).

**Direção visual:**
- Racing Black: #080D11
- Electric Lime: #B7FF00
- White: #FFFFFF
- Graphite: #2A2E34
- Silver: #C9CDD3
- Gold: #D4A235

Estética: Premium Motorsport, moderna, competitiva e tecnológica.

A interface deverá utilizar o verde elétrico para ações principais, destaques e indicadores competitivos.

**Design notes (v1.1):**
- Dark mode como padrão da marca (motorsport), não como default genérico de produto.
- Hero full-bleed com marca dominante; evitar cards decorativos e overlays no hero.
- Tipografia forte e esportiva (não stacks genéricos Inter/Roboto/Arial).
- Animações leves e intencionais (presença, não ruído).

# 4. PÚBLICOS E TIPOS DE USUÁRIOS

A arquitetura deverá contemplar diferentes perfis.

**Modelo multi-role (v1.1):** um único usuário autenticado pode acumular roles. Permissões são claims/roles na conta, não contas duplicadas.

Roles:

- `participant` (default no cadastro)
- `creator` (influenciador / criador autorizado)
- `organizer`
- `arena_operator`
- `admin`

### 4.1 Participante (`participant`)

- Criar conta.
- Configurar perfil.
- Encontrar desafios.
- Criar desafios (sujeito a política de aprovação).
- Aceitar convites.
- Participar de eventos.
- Reservar experiências.
- Consultar resultados.
- Acompanhar rankings.

### 4.2 Influenciador / Creator (`creator`)

- Perfil público de atleta ou criador.
- Criar desafios com página pública compartilhável.
- Convidar outros participantes.
- Gerenciar eventos vinculados.
- Consultar estatísticas básicas de participação (MVP) e audiência (Fase 4).
- Publicar resultados e conteúdos (conforme permissões).

### 4.3 Organizador (`organizer`)

- Criar eventos.
- Gerenciar competições.
- Configurar modalidades (dentro do permitido).
- Definir regulamentos.
- Gerenciar participantes.
- Controlar inscrições.
- Definir horários e locais.
- Registrar resultados.
- Validar classificações.

### 4.4 Arena / Estabelecimento (`arena_operator`)

- Cadastrar / editar instalações (admin cria no MVP; self-serve depois).
- Configurar modalidades disponíveis.
- Gerenciar horários.
- Controlar capacidade.
- Gerenciar reservas.
- Administrar eventos na arena.
- Gerenciar equipamentos e sessões.
- Acompanhar indicadores operacionais.

### 4.5 Administrador da plataforma (`admin`)

- Gerenciamento global.
- Aprovação de usuários, creators e organizadores.
- Moderação.
- Gerenciamento de modalidades (ativar/desativar).
- Gerenciamento de eventos.
- Auditoria.
- Gestão de denúncias.
- Controle de permissões.
- Relatórios financeiros e operacionais.
- Configurações gerais e feature flags.

# 5. FUNCIONALIDADES DA PLATAFORMA

## 5.1 Home pública (= Landing de marketing)

A home pública e o website institucional são a **mesma superfície** (ver §9). Não duplicar escopo.

Deve apresentar:

- Hero full-bleed com identidade DESAFIOS REAIS.
- Chamada principal: O SEU DESAFIO. A SUA HISTÓRIA.
- CTA: Explorar Desafios / Criar Desafio (ou Cadastro).
- Desafios em destaque.
- Próximos eventos / experiências SMK.
- Modalidades ativas (kart / gravity).
- Apresentação da DR Arena (Super Mountain Kart).
- Conteúdo audiovisual (quando houver).
- Patrocinadores (quando houver).
- CTA final para cadastro.

Após autenticação, o hub de produto (marketplace, calendário, reservas) vive em rotas autenticadas separadas — não na home de marketing.

## 5.2 Marketplace de desafios

Área para explorar desafios disponíveis (pública com limitações + autenticada completa).

Filtros MVP:

- Modalidade.
- Data.
- Tipo de competição.
- Status derivado (vagas abertas / esgotado / em andamento).
- Organizador.

Filtros pós-MVP: localização multi-cidade, nível, etc.

Cada desafio deverá possuir:

- Identificador único (UUID).
- Título.
- Descrição.
- Modalidade.
- Imagem ou vídeo.
- Participantes.
- Organizador / creator.
- Arena / localização.
- Data e horário (`starts_at`, `ends_at`).
- Regulamento.
- Capacidade (`capacity`, `confirmed_count`).
- Status (máquina abaixo).
- Resultado, quando finalizado.

### Máquina de estados (v1.1)

Estados canônicos:

- `draft`
- `pending_approval`
- `published`
- `in_progress`
- `completed`

Laterais:

- `cancelled`
- `disputed`

**Não** usar como status: `open`, `full`, `scheduled`. Esses são **derivados**:

- `scheduled` ≈ `published` + `starts_at` no futuro.
- `open` ≈ `published` + `confirmed_count` < `capacity`.
- `full` ≈ `published` + `confirmed_count` >= `capacity`.

## 5.3 Criação de desafios

Permitir que usuários autorizados criem desafios.

Fluxo:

1. Selecionar modalidade (MVP: kart / gravity).
2. Informar título.
3. Escrever descrição.
4. Selecionar tipo de competição.
5. Definir participantes ou equipes.
6. Selecionar local (MVP: Super Mountain Kart).
7. Definir data e horário.
8. Configurar regras.
9. Informar capacidade.
10. Publicar ou enviar para aprovação (`draft` → `pending_approval` ou `published`).

O sistema deverá suportar:

- Um contra um.
- Equipe contra equipe.
- Competições individuais.
- Torneios (estrutura mínima no MVP; brackets avançados depois).
- Competições com múltiplos participantes.
- Desafios criados por influenciadores.
- Eventos abertos ao público.

## 5.4 Calendário

Criar um calendário de desafios e eventos.

Funcionalidades MVP:

- Visualização mensal.
- Agenda pessoal.
- Eventos confirmados.
- Convites pendentes.
- Filtros por modalidade.
- Notificações de alterações (email + in-app básico).

Pós-MVP: visão semanal rica, disponibilidade multi-arena.

## 5.5 Perfis públicos

Cada usuário terá um perfil público com:

- Foto.
- Nome.
- Username.
- Biografia.
- Cidade.
- Modalidades favoritas.
- Histórico de desafios.
- Vitórias e participações.
- Estatísticas.
- Ranking (quando disponível).
- Medalhas e conquistas (Fase 4 — schema preparado).

Os resultados devem ser registrados apenas após validação do organizador, `arena_operator` ou mecanismo oficial da competição.

## 5.6 Rankings e gamificação

MVP:

- Ranking por modalidade (kart, gravity).
- Ranking geral seed (regras configuráveis).

Pós-MVP / Fase 4:

- Ranking por cidade, arena, temporada, influenciadores, equipes.
- Pontos, medalhas, conquistas, níveis.

As regras de pontuação deverão ser configuráveis por modalidade e temporada.

Não assumir que todas as modalidades utilizam a mesma fórmula de pontuação.

## 5.7 Sistema de inscrições e reservas

Permitir:

- Inscrição em desafios.
- Reserva de baterias de kart.
- Reserva de experiências.
- Seleção de data e horário.
- Controle de vagas.
- Confirmação.
- Cancelamento conforme política.
- Histórico de reservas.

Pagamentos comerciais no Brasil via **Mercado Pago** (checkout / preferências). Separar contabilmente pagamentos comerciais, patrocínios e eventuais premiações autorizadas.

# 6. INFLUENCERS E GROWTH ENGINE

Módulo estratégico — **Fase 4** para o conjunto completo; no MVP apenas páginas públicas de desafio + links compartilháveis.

Pós-MVP a plataforma permitirá que influenciadores criem desafios públicos e convidem participantes, com tracking:

- Visualizações, cliques, cadastros, inscrições, conversão, compartilhamentos.
- Links de referência e campanhas.

# 7. SISTEMA DE EVENTOS E ARENAS

Arquitetura multi-arena desde o dia 1.

Cada arena poderá possuir:

- Nome, logo, descrição, endereço, fotos.
- Modalidades, equipamentos, capacidade.
- Horários de funcionamento, calendário, eventos.
- Preços, disponibilidade.

A primeira arena publicada será Super Mountain Kart.

Módulo operacional MVP:

- Reservas.
- Check-in.
- Participantes.
- Baterias.
- Resultados.
- Ocupação básica.

# 8. PAGAMENTOS E PRÊMIOS — REQUISITO REGULATÓRIO

O conceito original contempla desafios monetários entre participantes e uma comissão de 10% sobre o valor total do desafio.

Essa funcionalidade depende de análise jurídica específica no Brasil.

Portanto:

- NÃO implementar apostas P2P automaticamente.
- NÃO criar carteira de apostas.
- NÃO manter fundos de participantes sob custódia própria.
- NÃO automatizar formação ou distribuição de poços.
- NÃO habilitar comissão sobre apostas sem aprovação jurídica.
- NÃO tratar uma competição de habilidade como automaticamente isenta de regulamentação.

A arquitetura poderá prever módulos futuros e feature flags para modalidades de premiação, desabilitados até aprovação jurídica e parceiros autorizados.

Na primeira versão, priorizar pagamentos de serviços convencionais via Mercado Pago:

- Inscrições em eventos.
- Reservas de kart.
- Experiências.
- Pacotes.
- Eventos corporativos.

# 9. LANDING PAGE E WEBSITE

Website institucional premium = home pública (§5.1). Responsivo e otimizado para conversão.

Páginas MVP:

1. Home (landing).
2. Sobre a DESAFIOS REAIS.
3. Como funciona.
4. Explorar desafios (marketplace).
5. Modalidades (kart / gravity ativas).
6. DR Arena (Super Mountain Kart).
7. Eventos / experiências.
8. Rankings (quando houver dados).
9. Contato.
10. Cadastro e login.

Páginas pós-MVP: influenciadores hub, patrocinadores self-serve.

Narrativa:

**Hero:** O SEU DESAFIO. A SUA HISTÓRIA.

**Subheadline:** Uma nova forma de competir, desafiar pessoas e viver experiências reais.

**CTAs:** EXPLORAR DESAFIOS · CRIAR MEU DESAFIO

Priorizar performance, SEO, acessibilidade e experiência mobile.

# 10. DESIGN SYSTEM

Criar um design system reutilizável.

Características:

- Dark motorsport como padrão da marca.
- Verde elétrico como cor de ação.
- Tipografia forte e esportiva.
- Bordas discretas.
- Componentes consistentes.
- Microinterações e animações leves.
- Layout responsivo mobile-first.

Componentes MVP:

- Header, Footer, Navigation.
- Challenge Card, Event Card, Arena Card (fora do hero).
- Ranking Table, Status Badge.
- Modal, Form, Filters.
- Booking Widget.
- Notification Center (básico).

Pós-MVP: Athlete Card rico, Media Gallery avançada, Statistics Card completo.

# 11. ARQUITETURA TECNOLÓGICA

Adotar uma arquitetura modular, escalável e bem documentada.

**Monorepo**

- `apps/web` — Next.js (React, TypeScript, Tailwind CSS).
- `apps/api` — Golang (REST, monólito modular).
- `packages/*` — tipos compartilhados, design tokens, configs quando fizer sentido.

**Backend**
- Golang.
- REST API versionada (`/api/v1`).
- Separação domínio / infraestrutura.
- sqlc + goose (migrations).
- Auth: email/senha + recuperação; session cookies httpOnly (preferencial) ou JWT + refresh; login social depois.
- RBAC por roles acumuláveis.

**Mobile**
- Flutter em etapa posterior (Fase 5). MVP = web responsiva.

**Dados e async**
- PostgreSQL.
- Redis (cache, rate limit, filas leves).
- Filas para notificações e tarefas assíncronas.

**Integrações**
- Mercado Pago (pagamentos comerciais).
- Object storage S3-compatible (mídias).
- Email transacional (provider a configurar via env; sem credenciais inventadas).
- Cloudflare (DNS, TLS, proteção).

**Infra**
- AWS (ou equivalente) + Docker + CI/CD.
- Começar monólito modular. Não criar microserviços prematuramente.

# 12. DOMÍNIOS FUNCIONAIS DO BACKEND

Organizar o backend em módulos:

- Identity & Authentication.
- Users & Profiles.
- Roles & Permissions.
- Challenges.
- Challenge Participants.
- Sports Categories (Modalities).
- Events.
- Arenas.
- Bookings.
- Scheduling.
- Competitions / Results.
- Rankings.
- Gamification (schema; UI Fase 4).
- Influencers / Followers (Fase 4).
- Media & Content.
- Payments (Mercado Pago, serviços aprovados).
- Notifications.
- Sponsorships (pós-MVP).
- Administration.
- Audit Logs.
- Analytics (básico no MVP).

Cada módulo deverá possuir responsabilidades claras e interfaces bem definidas.

# 13. SEGURANÇA, QUALIDADE E COMPLIANCE

Implementar:

- Validação de dados no backend.
- Autorização por papéis.
- Proteção de endpoints.
- Rate limiting.
- Logs estruturados.
- Auditoria de ações administrativas.
- Backup.
- Tratamento de erros.
- Monitoramento.
- Testes automatizados.
- Política de privacidade e adequação à LGPD.

**Menores e imagem (v1.1):**
- Contas de menores exigem fluxo de consentimento parental (detalhe jurídico externo).
- Consentimento de uso de imagem para conteúdo e coberturas.
- Resultados e mídias só públicos conforme consentimentos.
- Retenção mínima de dados pessoais; exclusão sob solicitação (LGPD).
- Não inventar texto legal — integrar documentos aprovados pelo jurídico.

# 13A. KPIs DO MVP

Medir desde o lançamento:

- Contas criadas (e verificadas).
- Desafios publicados.
- Taxa draft → published.
- Inscrições confirmadas em desafios.
- Reservas confirmadas (pagas).
- Check-ins realizados.
- Share rate de páginas públicas de desafio.
- Tempo até primeira reserva / primeiro desafio.

# 14. MVP — ORDEM DE DESENVOLVIMENTO

Não desenvolver todas as funcionalidades simultaneamente.

### FASE 1 — FOUNDATION

- Configuração do repositório (monorepo).
- Arquitetura e Docker Compose (Postgres, Redis).
- Design system (tokens + layout).
- Banco de dados + migrations.
- Autenticação e roles.
- Perfis.
- Landing page / home.
- Painel administrativo básico.
- Seed SMK + modalidades kart/gravity.

### FASE 2 — CHALLENGE PLATFORM

- Modalidades (API + UI).
- Criação de desafios + estados.
- Marketplace.
- Convites e participantes.
- Calendário.
- Inscrições.
- Página pública de cada desafio.

### FASE 3 — ARENA MANAGEMENT

- Cadastro/operação da arena SMK.
- Disponibilidade e slots.
- Reservas + Mercado Pago.
- Baterias de kart.
- Check-in.
- Gestão de participantes.
- Registro de resultados + ranking básico.

### FASE 4 — COMMUNITY & GROWTH

- Influenciadores e seguidores.
- Tracking de referral.
- Rankings ampliados.
- Gamificação.
- Notificações enriquecidas.

### FASE 5 — ADVANCED FEATURES

- Aplicativo Flutter.
- Novas modalidades ativas.
- Multi-arena UI.
- Patrocínios.
- Transmissões.
- Analytics avançado.
- Integrações comerciais adicionais.

# 15. PRINCÍPIOS DE DESENVOLVIMENTO

1. Desenvolver um produto real, não apenas um protótipo visual.
2. Priorizar experiência mobile (web responsiva no MVP).
3. Escrever código limpo, modular e testável.
4. Não duplicar lógica entre frontend e backend.
5. Centralizar regras de negócio no backend.
6. Criar documentação técnica em `docs/`.
7. Criar migrations para o banco.
8. Criar testes unitários e de integração.
9. Utilizar dados de demonstração claramente identificados.
10. Nunca inventar integrações externas ou credenciais.
11. Nunca habilitar funcionalidades reguladas sem aprovação.
12. Projetar desde o início para suportar múltiplas arenas e modalidades.

# 16. ORDEM DE ENTREGA ANTES DO CÓDIGO DE PRODUTO

Antes da implementação contínua da Fase 1, produzir e manter em `docs/`:

1. Product Requirements Document (PRD) — `docs/prd.md`
2. Sitemap completo — `docs/sitemap.md`
3. Arquitetura de software — `docs/architecture.md`
4. Diagrama C4 de contexto e containers — `docs/c4.md`
5. Modelo de dados PostgreSQL — `docs/data-model.md`
6. Estrutura de pastas do projeto — `docs/repo-structure.md`
7. Definição dos módulos do backend — `docs/backend-modules.md`
8. Definição dos componentes do frontend — `docs/frontend-components.md`
9. Roadmap técnico dividido em sprints — `docs/roadmap-sprints.md`
10. Plano de testes — `docs/test-plan.md`

Após os artefactos, iniciar a implementação da **FASE 1**.

Não tentar desenvolver o sistema inteiro em uma única etapa.

Cada funcionalidade deverá ser implementada, testada e documentada antes de avançar.

**Objetivo final:**

Construir DESAFIOS REAIS como uma plataforma brasileira de entretenimento competitivo, conectando pessoas, influenciadores, arenas, modalidades esportivas, eventos e experiências presenciais em um único ecossistema digital.

DESAFIOS REAIS.

O SEU DESAFIO. A SUA HISTÓRIA.
