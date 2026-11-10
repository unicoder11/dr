# DESAFIOS REAIS — Product Requirements Document (PRD)

**Versão:** 1.0  
**Alinhado a:** `overview.md` v1.1  
**Mercado:** Brasil (pt-BR)  
**Escopo:** MVP (decisão 1C)

---

## 1. Resumo

DESAFIOS REAIS é uma plataforma de entretenimento competitivo que conecta o digital ao presencial. O MVP lança **uma arena** (Super Mountain Kart) e **duas modalidades** (Super Mountain Kart e Gravity Kart), com arquitetura já preparada para multi-arena e multi-modalidade.

## 2. Problema

Pessoas, influenciadores e organizadores não têm um hub único para criar desafios reais, reservar experiências presenciais, registrar resultados oficiais e transformar competições em conteúdo compartilhável.

## 3. Objetivos do MVP

1. Permitir cadastro, login e perfil público básico.
2. Publicar e descobrir desafios de kart/gravity na SMK.
3. Inscrever-se em desafios e reservar baterias/experiências com pagamento Mercado Pago.
4. Operar check-in e resultados validados na arena.
5. Exibir ranking básico por modalidade.
6. Converter visitantes via landing premium mobile-first.

### Não-objetivos (MVP)

- App Flutter.
- UI multi-arena / self-serve de arenas.
- Modalidades além de kart/gravity (exceto seed inativo).
- Apostas P2P / carteira / poços.
- Growth engine completo de influenciadores.
- Transmissões ao vivo.

## 4. Personas

| Persona | Role(s) | Necessidade principal |
|---------|---------|------------------------|
| Competidor casual | `participant` | Descobrir, se inscrever, reservar, ver resultado |
| Creator / influenciador | `participant` + `creator` | Página pública de confronto + convites |
| Organizador | `organizer` | Criar desafio/evento, validar resultado |
| Operador de arena | `arena_operator` | Slots, reservas, check-in, baterias |
| Admin DR | `admin` | Aprovar roles, modalidades, moderação |

Um usuário pode acumular múltiplos roles na mesma conta.

## 5. User journeys críticos

### 5.1 Cadastro → primeiro desafio

1. Visitante vê landing → CTA Cadastro.
2. Cria conta (email/senha) → role `participant`.
3. Completa perfil (username, foto opcional, cidade).
4. Explora marketplace → abre desafio → inscreve-se (pago ou gratuito conforme config).
5. Recebe confirmação (email + in-app).

### 5.2 Creator publica confronto

1. Admin concede role `creator`.
2. Creator cria desafio (`draft` → `pending_approval` ou `published` se auto-aprovado).
3. Página pública gerada com link compartilhável.
4. Convidados aceitam; vagas controladas por `capacity`.

### 5.3 Reserva de bateria SMK

1. Usuário escolhe data/horário disponível.
2. Cria booking → checkout Mercado Pago.
3. Webhook confirma pagamento → booking `confirmed`.
4. No dia: `arena_operator` faz check-in → sessão/bateria.

### 5.4 Resultado oficial

1. Desafio `published` → no horário → `in_progress`.
2. Operador/organizador registra resultado.
3. Validação → desafio `completed` → atualiza ranking.

## 6. Requisitos funcionais

### RF-AUTH
- Cadastro email/senha, login, logout, recovery.
- Sessão segura (cookies httpOnly preferencial).
- RBAC por roles acumuláveis.

### RF-PROFILE
- Perfil público: nome, username, bio, cidade, histórico.
- Edição do próprio perfil.

### RF-CHALLENGE
- CRUD com estados: `draft`, `pending_approval`, `published`, `in_progress`, `completed`, `cancelled`, `disputed`.
- Campos derivados: open/full/scheduled (não são status).
- Marketplace com filtros MVP.
- Página pública por slug/UUID.

### RF-BOOKING
- Slots de disponibilidade por arena/modalidade.
- Reserva + cancelamento conforme política.
- Integração Mercado Pago (serviços comerciais apenas).

### RF-ARENA-OPS
- Check-in, listagem de participantes do dia, registro de resultados.

### RF-RANKING
- Ranking por modalidade; regras configuráveis (tabela/config).
- Recálculo após resultado validado.

### RF-ADMIN
- Aprovar creators/organizers.
- Ativar/desativar modalidades.
- Feature flags (ex.: prizes_p2p = off).
- Audit log de ações admin.

### RF-CONTENT
- Upload de imagens para desafios/arena via storage S3-compatible.
- Landing e páginas institucionais.

## 7. Requisitos não funcionais

| ID | Requisito |
|----|-----------|
| RNF-1 | Mobile-first; LCP landing < 2.5s em 4G médio (meta) |
| RNF-2 | API REST versionada `/api/v1` |
| RNF-3 | Rate limiting em auth e writes |
| RNF-4 | Logs estruturados JSON |
| RNF-5 | Backups diários PostgreSQL |
| RNF-6 | LGPD: consentimentos, exclusão sob solicitação |
| RNF-7 | Sem credenciais hardcoded; tudo via env |
| RNF-8 | Testes automatizados nos fluxos críticos |

## 8. Regras de negócio relevantes

1. Resultados só entram no ranking após validação oficial.
2. Capacidade: inscrição bloqueada quando `confirmed_count >= capacity`.
3. Pagamentos P2P/prêmios desabilitados por feature flag até jurídico.
4. Menores: fluxo de consentimento parental (texto jurídico externo).
5. Dados demo devem ser claramente marcados (`is_demo` / prefixo).

## 9. Métricas de sucesso (KPIs)

- Contas criadas / verificadas
- Desafios publicados
- Taxa draft → published
- Inscrições confirmadas
- Reservas pagas confirmadas
- Check-ins
- Share rate de páginas de desafio
- Tempo até primeira reserva ou primeiro desafio

## 10. Dependências externas

- Mercado Pago
- PostgreSQL, Redis
- Object storage S3-compatible
- Email transacional (provider via env)
- Cloudflare

## 11. Entrega

Artefactos em `docs/` → implementação Fase 1 (foundation) → Fases 2–3 para challenges + arena → Fases 4–5 growth e mobile nativo.

## 12. Riscos

| Risco | Mitigação |
|-------|-----------|
| Escopo creep multi-modalidade | Scope lock 1C + feature flags |
| Regulação de apostas | Flags off; só pagamentos comerciais |
| Atraso Brand Bible | Tokens hex já definidos no overview |
| Operação arena sem tooling | Priorizar check-in/resultados na Fase 3 |
