# DESAFIOS REAIS

Plataforma brasileira de entretenimento competitivo.

**Brief:** [`overview.md`](overview.md) (v1.1)  
**Docs:** [`docs/`](docs/)

## Stack

- `apps/web` — Next.js (pt-BR, mobile-first)
- `apps/api` — Go monólito modular (REST `/api/v1`)
- `packages/design-tokens` — Racing Black / Electric Lime
- PostgreSQL + Redis via Docker Compose

## Quick start

```bash
cp .env.example .env
docker compose up -d
cd apps/api && go run ./cmd/migrate && go run ./cmd/api
# outro terminal
cd apps/web && npm install && npm run dev
```

- Web: http://localhost:3000  
- API health: http://localhost:8080/healthz  

Admin bootstrap (se `ADMIN_EMAIL` / `ADMIN_PASSWORD` no `.env`): criado no start da API após migrate.

## Fase 1 (scaffold)

- Auth email/senha + sessions cookie
- Perfis públicos básicos
- Admin listagem de users
- Landing + páginas institucionais
- Seed arena SMK + modalidades kart/gravity
- Feature flag `payments.p2p_prizes=false`

## Documentação

| Artefato | Path |
|----------|------|
| PRD | `docs/prd.md` |
| Sitemap | `docs/sitemap.md` |
| Arquitetura | `docs/architecture.md` |
| C4 | `docs/c4.md` |
| Data model | `docs/data-model.md` |
| Repo structure | `docs/repo-structure.md` |
| Backend modules | `docs/backend-modules.md` |
| Frontend components | `docs/frontend-components.md` |
| Sprints | `docs/roadmap-sprints.md` |
| Test plan | `docs/test-plan.md` |

## Princípios

1. Regras de negócio no backend.
2. Multi-arena / multi-modalidade no modelo; MVP só SMK + kart/gravity.
3. Sem apostas P2P até aprovação jurídica.
4. Sem credenciais commitadas.
