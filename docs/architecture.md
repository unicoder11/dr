# DESAFIOS REAIS — Arquitetura de Software

**Versão:** 1.0  
**Estilo:** Monólito modular + BFF leve no Next.js  
**Escopo:** MVP com extensibilidade multi-arena / multi-modalidade

---

## 1. Visão geral

```text
Browser → Cloudflare → Next.js (apps/web) → Go API (apps/api) → PostgreSQL
                                              ├→ Redis
                                              ├→ Mercado Pago
                                              ├→ S3-compatible storage
                                              └→ Email provider
```

- **Web:** UI, SEO, server components onde fizer sentido; chama API REST.
- **API:** toda regra de negócio, authz, pagamentos, rankings.
- **Sem microserviços** no MVP.

## 2. Princípios

1. Regras de negócio só no backend Go.
2. Domínio isolado de infraestrutura (ports/adapters).
3. Multi-tenancy leve por `arena_id` / `modality_id` desde o dia 1.
4. Feature flags para capacidades reguladas e rollout.
5. Idempotência em webhooks de pagamento.
6. Migrations versionadas (goose); queries tipadas (sqlc).

## 3. Monorepo

| Path | Responsabilidade |
|------|------------------|
| `apps/web` | Next.js App Router, design system, páginas |
| `apps/api` | HTTP server Go, módulos de domínio |
| `packages/design-tokens` | Cores, tipografia, spacing (CSS/TS) |
| `packages/config` | ESLint/TS shared (opcional) |
| `docs/` | PRD, C4, data model, etc. |
| `docker-compose.yml` | Postgres + Redis (+ MinIO opcional) |

## 4. API Go — camadas

```text
cmd/api/main.go
internal/
  config/
  http/          # router, middleware, handlers
  auth/          # sessions, password, RBAC
  domain/        # entities + ports (interfaces)
  modules/       # identity, challenges, arenas, bookings, ...
  infra/         # postgres, redis, mpago, s3, mail
  jobs/          # workers leves (notificações)
```

Cada módulo expõe:
- `Service` (casos de uso)
- `Repository` interface
- Handlers HTTP finos

## 5. Autenticação e autorização

- Cadastro/login email+senha (bcrypt/argon2id).
- Sessão: cookie `httpOnly`, `Secure`, `SameSite=Lax` com store Redis ou tabela `sessions`.
- Alternativa aceitável: JWT access curto + refresh rotativo.
- Middleware carrega `UserID` + `Roles[]`.
- Autorização por role e por ownership (`challenge.created_by`, `arena_id`).

Roles: `participant`, `creator`, `organizer`, `arena_operator`, `admin`.

## 6. Dados

- PostgreSQL como source of truth.
- Redis: rate limit, session, cache de rankings, filas simples.
- Soft deletes apenas onde necessário (usuários LGPD = hard/anonymize flow).

## 7. Pagamentos

- Apenas serviços comerciais (booking, inscrição paga, pacotes).
- Fluxo: criar preferência Mercado Pago → redirect/checkout → webhook → confirmar booking.
- Feature flag `payments.p2p_prizes` = `false`.

## 8. Mídia

- Upload: API gera URL pré-assinada → client sobe para S3-compatible.
- Metadados em `media_assets`.

## 9. Observabilidade

- Logs JSON (request_id, user_id, route).
- Health: `/healthz`, `/readyz` (DB/Redis).
- Métricas básicas depois (Prometheus opcional).

## 10. Ambientes

| Env | Uso |
|-----|-----|
| local | docker-compose |
| staging | deploy preview |
| production | AWS + Cloudflare |

Secrets só via env / secret manager. Nunca commitados.

## 11. Evolução

- Fase 4: analytics e referral.
- Fase 5: app Flutter consumindo a mesma API `/api/v1`.
- Extrair workers dedicados só se a fila justificar.
