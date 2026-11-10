# DESAFIOS REAIS — Plano de Testes

**Versão:** 1.0  
**Pirâmide:** unitários (domínio) → integração (API+DB) → E2E críticos (web)

---

## 1. Objetivos

- Garantir máquina de estados de desafios sem transições ilegais.
- Garantir RBAC (roles acumuláveis).
- Garantir capacidade / overbooking impossível.
- Garantir webhooks de pagamento idempotentes.
- Garantir que flags regulatórias permanecem off.
- Regredir landing e auth a cada PR.

---

## 2. Ferramentas

| Camada | Ferramenta |
|--------|------------|
| Go unit/integration | `go test`, testcontainers ou Postgres de compose |
| Web unit | Vitest / Jest (componentes puros) |
| E2E | Playwright |
| CI | GitHub Actions: lint + test em PR |

---

## 3. Testes unitários (API)

| Módulo | Casos |
|--------|-------|
| challenges | transições válidas/inválidas; derivados open/full |
| participants | bloqueio quando full; invite duplicado |
| auth | hash password; session expiry |
| rankings | scoring_config por modalidade |
| payments | feature flag P2P rejeita caminhos de prêmio |

---

## 4. Testes de integração (API)

| Fluxo | Asserts |
|-------|---------|
| Register → Login → Me | cookie/session; roles default participant |
| Create challenge draft → submit → approve → published | status trail + audit |
| Join até capacity | último recebe `challenge_full` |
| Booking pending → webhook duplicate | um confirmed; idempotente |
| Grant creator role | endpoint creator libera; sem role 403 |
| Readyz | 200 com DB up; 503 com DB down |

Usar DB real em CI (service container). Migrations goose aplicadas no setup.

---

## 5. E2E (Playwright) — smoke MVP

1. Home carrega hero + CTAs.
2. Cadastro + login + editar perfil.
3. Admin concede role (via seed/API helper).
4. Criar desafio e ver página pública.
5. Segundo user aceita convite / join.
6. Fluxo de reserva até redirect MP (mock/sandbox).
7. Ops check-in marca participante.

Tags: `@smoke` no CI; `@payments` só com secrets sandbox.

---

## 6. Segurança e compliance checks

- Rate limit em `/auth/login` (teste de integração leve).
- Endpoints admin sem cookie → 401; participant → 403.
- Upload só com content-types permitidos.
- Nenhum secret no bundle web (`NEXT_PUBLIC_*` revisado).
- Dados `is_demo` não entram em totais financeiros.

---

## 7. Performance (meta, não gate rígido no S0)

- Landing LCP mobile < 2.5s (lab).
- Listagem `/desafios` < 500ms API p95 com seed 1k (meta S4).

---

## 8. Critérios de saída por sprint

Cada sprint do `roadmap-sprints.md` só fecha com:
1. Testes novos/atualizados para a entrega.
2. CI verde.
3. Notas de teste manual ops (se UI ops) no PR.

---

## 9. Dados de teste

- Fixtures com emails `*@demo.desafiosreais.local`
- `is_demo = true`
- Senhas só em secrets locais / `.env` não commitado
