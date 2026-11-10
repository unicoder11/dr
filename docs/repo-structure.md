# DESAFIOS REAIS — Estrutura de Pastas

**Versão:** 1.0  
**Tipo:** Monorepo

```text
dr/
├── overview.md
├── README.md
├── docker-compose.yml
├── .env.example
├── .gitignore
├── package.json                 # workspaces root (opcional)
├── docs/
│   ├── prd.md
│   ├── sitemap.md
│   ├── architecture.md
│   ├── c4.md
│   ├── data-model.md
│   ├── repo-structure.md
│   ├── backend-modules.md
│   ├── frontend-components.md
│   ├── roadmap-sprints.md
│   └── test-plan.md
├── packages/
│   └── design-tokens/
│       ├── package.json
│       ├── tokens.css
│       └── index.ts
├── apps/
│   ├── api/
│   │   ├── go.mod
│   │   ├── go.sum
│   │   ├── Dockerfile
│   │   ├── cmd/
│   │   │   └── api/
│   │   │       └── main.go
│   │   ├── internal/
│   │   │   ├── config/
│   │   │   ├── http/
│   │   │   │   ├── router.go
│   │   │   │   ├── middleware/
│   │   │   │   └── handlers/
│   │   │   ├── auth/
│   │   │   ├── modules/
│   │   │   │   ├── identity/
│   │   │   │   ├── users/
│   │   │   │   ├── challenges/
│   │   │   │   ├── arenas/
│   │   │   │   ├── bookings/
│   │   │   │   ├── results/
│   │   │   │   ├── rankings/
│   │   │   │   ├── payments/
│   │   │   │   ├── notifications/
│   │   │   │   └── admin/
│   │   │   ├── infra/
│   │   │   │   ├── postgres/
│   │   │   │   ├── redis/
│   │   │   │   ├── storage/
│   │   │   │   ├── mail/
│   │   │   │   └── mercadopago/
│   │   │   └── jobs/
│   │   ├── migrations/          # goose
│   │   ├── sql/                 # sqlc queries
│   │   ├── sqlc.yaml
│   │   └── scripts/
│   └── web/
│       ├── package.json
│       ├── next.config.ts
│       ├── tsconfig.json
│       ├── tailwind.config.ts
│       ├── postcss.config.mjs
│       ├── public/
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx              # landing
│       │   │   ├── sobre/
│       │   │   ├── como-funciona/
│       │   │   ├── modalidades/
│       │   │   ├── arena/
│       │   │   ├── desafios/
│       │   │   ├── rankings/
│       │   │   ├── entrar/
│       │   │   ├── cadastro/
│       │   │   ├── app/                  # authenticated hub
│       │   │   ├── ops/
│       │   │   └── admin/
│       │   ├── components/
│       │   │   ├── layout/
│       │   │   ├── ui/
│       │   │   ├── challenge/
│       │   │   ├── booking/
│       │   │   └── marketing/
│       │   ├── lib/
│       │   │   ├── api.ts
│       │   │   └── auth.ts
│       │   └── styles/
│       │       └── globals.css
│       └── Dockerfile
└── .github/
    └── workflows/
        └── ci.yml
```

## Notas

- Começar enxuto: criar pastas de módulos sob demanda; não stubar todos os arquivos vazios.
- `packages/design-tokens` é a fonte de Racing Black / Electric Lime.
- Migrations em `apps/api/migrations` são a única forma de mudar schema.
