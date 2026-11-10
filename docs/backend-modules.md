# DESAFIOS REAIS — Módulos do Backend (Go)

**Versão:** 1.0  
**Padrão:** cada módulo = service + repository port + HTTP handlers

---

## Mapa MVP

| Módulo | Fase | Responsabilidade |
|--------|------|------------------|
| identity | 1 | Register, login, logout, password recovery, sessions |
| users | 1 | Profiles, username, avatar metadata |
| roles | 1 | Grant/revoke roles; helpers `HasRole` |
| admin | 1 | Users list, flags, moderation hooks, audit write |
| modalities | 2 | CRUD/list; active filter |
| challenges | 2 | Lifecycle, marketplace queries, public page data |
| participants | 2 | Invites, accept/decline, capacity checks |
| arenas | 3 | Arena CRUD (admin), publish flag, arena_modalities |
| scheduling | 3 | availability_slots |
| bookings | 3 | Create/cancel booking, link to payments |
| payments | 3 | Mercado Pago preferences + webhooks idempotentes |
| results | 3 | Submit/validate results |
| rankings | 3 | Recalc ranking_entries |
| notifications | 2–3 | In-app + enqueue email |
| media | 1–2 | Presigned upload URLs |
| audit | 1 | Append-only audit_logs |
| analytics | 3+ | Contadores KPI básicos |

Módulos adiados (interfaces/flags só): gamification rica, followers, sponsorships, live media.

---

## Contratos HTTP (v1, resumo)

### Identity
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `GET  /api/v1/auth/me`

### Users
- `GET  /api/v1/users/{username}`
- `PATCH /api/v1/me/profile`

### Challenges
- `GET  /api/v1/challenges` (filtros)
- `GET  /api/v1/challenges/{idOrSlug}`
- `POST /api/v1/challenges`
- `PATCH /api/v1/challenges/{id}`
- `POST /api/v1/challenges/{id}/submit-approval`
- `POST /api/v1/challenges/{id}/publish` (admin/auto)
- `POST /api/v1/challenges/{id}/cancel`

### Participants
- `POST /api/v1/challenges/{id}/invites`
- `POST /api/v1/challenges/{id}/join`
- `POST /api/v1/participants/{id}/accept`
- `POST /api/v1/participants/{id}/decline`

### Arenas & slots
- `GET  /api/v1/arenas`
- `GET  /api/v1/arenas/{slug}`
- `GET  /api/v1/arenas/{slug}/slots`
- `POST /api/v1/admin/arenas` (admin)

### Bookings & payments
- `POST /api/v1/bookings`
- `GET  /api/v1/me/bookings`
- `POST /api/v1/bookings/{id}/cancel`
- `POST /api/v1/webhooks/mercadopago`

### Ops
- `POST /api/v1/ops/check-in`
- `POST /api/v1/ops/results`
- `POST /api/v1/ops/results/{id}/validate`

### Rankings
- `GET /api/v1/rankings?modality=&season=`

### Admin
- `GET/PATCH /api/v1/admin/users/{id}/roles`
- `GET/PATCH /api/v1/admin/feature-flags`
- `GET /api/v1/admin/audit-logs`
- `GET/PATCH /api/v1/admin/modalities/{id}`

### Health
- `GET /healthz`
- `GET /readyz`

---

## Regras transversais

1. Toda mutação autenticada passa por RBAC + ownership checks.
2. Webhooks verificam assinatura/segredo do provedor.
3. Transições de `challenges.status` só via service (nunca patch livre de status pelo client).
4. Erros de domínio → 4xx com código estável (`challenge_full`, `invalid_transition`).
5. `is_demo` filtrável; demos nunca misturam com produção em relatórios financeiros.
