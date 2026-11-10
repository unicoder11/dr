# DESAFIOS REAIS — Sitemap

**Versão:** 1.0  
**Escopo:** MVP (web Next.js)  
**Nota:** Home pública = landing de marketing. Hub autenticado é separado.

---

## 1. Mapa de rotas

```text
/
├── (marketing)
│   ├── /                          Home / Landing
│   ├── /sobre                     Sobre DESAFIOS REAIS
│   ├── /como-funciona             Como funciona
│   ├── /modalidades               Modalidades (kart, gravity)
│   ├── /modalidades/[slug]        Detalhe modalidade
│   ├── /arena                     DR Arena — Super Mountain Kart
│   ├── /eventos                   Eventos / experiências (lista)
│   ├── /eventos/[slug]            Detalhe evento
│   ├── /contato                   Contato
│   ├── /privacidade               Política de privacidade
│   └── /termos                    Termos de uso
│
├── (auth)
│   ├── /entrar                    Login
│   ├── /cadastro                  Cadastro
│   ├── /recuperar-senha           Solicitar recovery
│   └── /redefinir-senha           Redefinir com token
│
├── (discover — público com limites)
│   ├── /desafios                  Marketplace
│   ├── /desafios/[idOrSlug]       Página pública do desafio
│   ├── /rankings                  Rankings
│   └── /u/[username]              Perfil público
│
├── (app — autenticado)
│   ├── /app                       Hub (redirect smart)
│   ├── /app/calendario            Agenda pessoal
│   ├── /app/desafios/novo         Criar desafio
│   ├── /app/desafios/[id]/editar Editar (owner/org)
│   ├── /app/inscricoes            Minhas inscrições
│   ├── /app/reservas              Minhas reservas
│   ├── /app/reservas/nova         Nova reserva (slots SMK)
│   ├── /app/convites              Convites pendentes
│   ├── /app/perfil                Editar perfil
│   └── /app/notificacoes          Notificações
│
├── (ops — arena_operator / organizer)
│   ├── /ops                       Dashboard operacional
│   ├── /ops/agenda                Agenda do dia
│   ├── /ops/check-in              Check-in
│   ├── /ops/baterias              Baterias / sessões
│   ├── /ops/resultados            Registrar / validar resultados
│   └── /ops/desafios              Desafios sob gestão
│
└── (admin — admin)
    ├── /admin                     Dashboard
    ├── /admin/usuarios            Usuários e roles
    ├── /admin/modalidades         Modalidades (ativar/seed)
    ├── /admin/arenas              Arenas (MVP: SMK)
    ├── /admin/desafios            Moderação / aprovação
    ├── /admin/feature-flags       Feature flags
    ├── /admin/auditoria           Audit logs
    └── /admin/relatorios          Relatórios básicos
```

---

## 2. Árvore de navegação (UI)

### Público
- Logo → `/`
- Desafios → `/desafios`
- Arena → `/arena`
- Modalidades → `/modalidades`
- Rankings → `/rankings`
- Entrar / Criar conta

### Autenticado (header)
- Hub `/app`
- Calendário
- Reservas
- Criar desafio
- Notificações
- Avatar → perfil / sair

### Ops
- Agenda, Check-in, Resultados

### Admin
- Usuários, Desafios, Modalidades, Flags, Auditoria

---

## 3. CTAs da home

| CTA | Destino |
|-----|---------|
| Explorar Desafios | `/desafios` |
| Criar Meu Desafio | `/cadastro` ou `/app/desafios/novo` se autenticado |
| Conhecer a Arena | `/arena` |

---

## 4. Páginas pós-MVP (não implementar agora)

- `/influenciadores`, `/influenciadores/[username]`
- `/patrocinadores`
- Multi-arena browse `/arenas`, `/arenas/[slug]`
- Live / media hubs
- App Flutter deep links

---

## 5. SEO

- Todas as rotas marketing + `/desafios/[id]` + `/u/[username]` com metadata Open Graph.
- `sitemap.xml` e `robots.txt` gerados pelo Next.js.
- Idioma padrão `pt-BR`.
