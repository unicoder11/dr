# DESAFIOS REAIS — Componentes Frontend

**Versão:** 1.0  
**Stack:** Next.js App Router, React, TypeScript, Tailwind  
**Tokens:** `packages/design-tokens`

---

## 1. Design tokens (MVP)

| Token | Valor |
|-------|-------|
| `--color-racing-black` | `#080D11` |
| `--color-electric-lime` | `#B7FF00` |
| `--color-white` | `#FFFFFF` |
| `--color-graphite` | `#2A2E34` |
| `--color-silver` | `#C9CDD3` |
| `--color-gold` | `#D4A235` |

Tipografia: display esportiva + sans legível (definir fontes no scaffold; evitar Inter/Roboto/Arial).

---

## 2. Layout

| Componente | Uso |
|------------|-----|
| `SiteHeader` | Nav pública + CTAs |
| `SiteFooter` | Links legais / contato |
| `AppShell` | Hub autenticado |
| `OpsShell` | Área operacional |
| `AdminShell` | Área admin |
| `MobileNav` | Drawer / bottom nav mobile |

---

## 3. Marketing

| Componente | Notas |
|------------|-------|
| `HeroBrand` | Full-bleed; marca dominante; sem cards no hero |
| `HeroCTAGroup` | Explorar / Criar |
| `SectionHowItWorks` | 1 job por seção |
| `ArenaShowcase` | SMK visual anchor |
| `FeaturedChallenges` | Lista/destaques fora do hero |
| `FinalCTA` | Cadastro |

---

## 4. Domínio

| Componente | Notas |
|------------|-------|
| `ChallengeCard` | Imagem, título, modalidade, status badge, data |
| `ChallengeStatusBadge` | Mapeia status + derivados open/full |
| `ChallengeFilters` | Modalidade, data, tipo |
| `ChallengePublicHeader` | Página pública compartilhável |
| `ParticipantList` | Avatares / nomes |
| `InvitePanel` | Convites pendentes |
| `EventCard` | Experiências / eventos |
| `ArenaCard` | Fora do hero |
| `RankingTable` | Posição, user, pontos |
| `BookingWidget` | Escolha de slot + preço |
| `CheckoutBanner` | Estado pagamento |
| `CalendarMonth` | Agenda pessoal |
| `NotificationCenter` | Dropdown básico |
| `ProfileHeader` | Avatar, username, bio |
| `StatsStrip` | Vitórias / participações (simples) |

---

## 5. UI primitives

| Componente | Notas |
|------------|-------|
| `Button` | primary = Electric Lime |
| `Input`, `Textarea`, `Select` | Forms |
| `Modal` / `Dialog` | Confirmações |
| `FormField` | Label + error |
| `Spinner` / `Skeleton` | Loading |
| `EmptyState` | Listas vazias |
| `Toast` | Feedback |

Evitar cards decorativos; cards só quando encapsulam interação (desafio, booking, filtro).

---

## 6. Páginas → componentes (MVP)

| Rota | Componentes chave |
|------|-------------------|
| `/` | HeroBrand, FeaturedChallenges, ArenaShowcase, FinalCTA |
| `/desafios` | ChallengeFilters, ChallengeCard[] |
| `/desafios/[slug]` | ChallengePublicHeader, ParticipantList, CTA join |
| `/app/reservas/nova` | BookingWidget |
| `/ops/check-in` | ParticipantList + actions |
| `/admin/usuarios` | Table + role editor |

---

## 7. Motion (2–3 intencionais)

1. Hero headline reveal suave no load.
2. Hover/focus em CTA primary (lime).
3. Transição de status badge em challenge cards.

Sem glow excessivo, sem particle noise.
