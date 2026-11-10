# DESAFIOS REAIS — Roadmap Técnico (Sprints)

**Versão:** 1.0  
**Cadência sugerida:** 1–2 semanas por sprint  
**Pré-requisito:** artefactos em `docs/` concluídos

---

## S0 — Foundation repo

**Entrega**
- Monorepo `apps/web`, `apps/api`, `packages/design-tokens`
- `docker-compose` (Postgres, Redis)
- `.env.example`, README, CI lint/test skeleton
- Health endpoint API
- Tokens CSS + landing shell mínima

**DoD:** `docker compose up` + API `/healthz` + web home renderiza.

---

## S1 — Identity & Admin básico

**Entrega**
- Migrations: users, profiles, user_roles, sessions, audit_logs, feature_flags
- Register / login / logout / me
- RBAC middleware
- Perfil editável + página pública username
- Admin: listar users, grant roles
- Seed admin via env

**DoD:** fluxo auth E2E local; admin concede `creator`.

---

## S2 — Landing & conteúdo institucional

**Entrega**
- Home completa (hero brand, seções, CTAs)
- Sobre, Como funciona, Arena SMK, Modalidades, Contato
- SEO metadata, robots, sitemap
- Design system: Header, Footer, Button, Section layouts

**DoD:** Lighthouse mobile razoável; rotas marketing no ar.

---

## S3 — Challenges core

**Entrega**
- Migrations modalities, arenas, challenges, media_assets
- Seed SMK + kart/gravity
- CRUD desafios + máquina de estados
- Página pública `/desafios/[slug]`
- Admin aprovação `pending_approval`

**DoD:** creator cria e publica (ou envia aprovação); página pública acessível.

---

## S4 — Marketplace & participação

**Entrega**
- Listagem + filtros
- Convites / join / capacity
- Calendário pessoal
- Notificações in-app básicas + email enqueue

**DoD:** dois users completam invite → confirmed; marketplace filtra.

---

## S5 — Bookings & Mercado Pago

**Entrega**
- availability_slots, bookings, payments
- BookingWidget + checkout
- Webhook idempotente
- Minhas reservas + cancelamento

**DoD:** pagamento sandbox confirma booking; flag P2P continua off.

---

## S6 — Ops, resultados & ranking

**Entrega**
- Check-in ops
- Results validate
- Ranking por modalidade + UI
- Relatórios admin básicos / KPIs counters

**DoD:** desafio completed atualiza ranking; check-in registrado.

---

## Pós-MVP

| Sprint block | Fase overview | Foco |
|--------------|---------------|------|
| S7–S8 | Fase 4 | Followers, referral links, gamificação |
| S9+ | Fase 5 | Flutter, multi-arena UI, media live |

---

## Dependências entre sprints

```mermaid
flowchart LR
  S0 --> S1 --> S2
  S1 --> S3 --> S4
  S3 --> S5 --> S6
  S2 --> S3
```

S2 pode paralelizar com início de S3 após S1.
