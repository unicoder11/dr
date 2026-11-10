"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminGate } from "@/components/admin/AdminGate";
import { AdminShell, AdminStat } from "@/components/admin/AdminShell";
import { GlassPanel } from "@/components/ui/Glass";
import { api, type AdminOverview, type AdminChallenge, type AdminAuditRow } from "@/lib/api";

export default function AdminDashboardPage() {
  return (
    <AdminGate>
      {() => <Dashboard />}
    </AdminGate>
  );
}

function Dashboard() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [pending, setPending] = useState<AdminChallenge[]>([]);
  const [audit, setAudit] = useState<AdminAuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.adminOverview(),
      api.adminChallenges("pending_approval"),
      api.adminAudit(),
    ])
      .then(([o, c, a]) => {
        setOverview(o);
        setPending(c.slice(0, 5));
        setAudit(a.slice(0, 8));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "erro"));
  }, []);

  return (
    <AdminShell
      title="Dashboard"
      subtitle="Visão global da plataforma · DESAFIOS REAIS"
    >
      {error && <p className="mb-4 text-red-400">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStat label="Usuários" value={overview?.users_total ?? "—"} />
        <AdminStat
          label="Desafios vivos"
          value={overview?.challenges_published ?? "—"}
        />
        <AdminStat
          label="Em aprovação"
          value={overview?.challenges_pending ?? "—"}
          hint="Moderação"
        />
        <AdminStat
          label="Reservas"
          value={overview?.bookings_confirmed ?? "—"}
          hint={`${overview?.open_slots ?? 0} slots abertos`}
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <AdminStat label="Arenas publicadas" value={overview?.arenas_published ?? "—"} />
        <AdminStat label="Lives" value={overview?.live_streams ?? "—"} />
        <Link
          href="/admin/desafios?status=pending_approval"
          className="glass-card flex items-center justify-between rounded-2xl p-5 transition hover:border-lime/40"
        >
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-lime">
              Ação rápida
            </p>
            <p className="mt-2 font-display text-2xl text-white">Moderar desafios</p>
          </div>
          <span className="text-lime">→</span>
        </Link>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <GlassPanel className="!rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl text-white">Fila de aprovação</h2>
            <Link href="/admin/desafios" className="text-xs text-lime hover:underline">
              Ver todos
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {pending.length === 0 && (
              <li className="text-sm text-silver">Nada pendente.</li>
            )}
            {pending.map((c) => (
              <li
                key={c.id}
                className="flex items-start justify-between gap-3 border-t border-white/10 pt-3 first:border-0 first:pt-0"
              >
                <div>
                  <p className="text-white">{c.title}</p>
                  <p className="text-xs text-silver">
                    @{c.creator_username} · {c.modality_name} · {c.arena_name}
                  </p>
                </div>
                <Link
                  href={`/desafios/${c.slug}`}
                  className="shrink-0 text-xs text-lime hover:underline"
                >
                  Abrir
                </Link>
              </li>
            ))}
          </ul>
        </GlassPanel>

        <GlassPanel className="!rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl text-white">Auditoria recente</h2>
            <Link href="/admin/auditoria" className="text-xs text-lime hover:underline">
              Ver todos
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {audit.length === 0 && (
              <li className="text-sm text-silver">Sem eventos ainda.</li>
            )}
            {audit.map((row) => (
              <li
                key={row.id}
                className="border-t border-white/10 pt-3 text-sm first:border-0 first:pt-0"
              >
                <p className="text-white">
                  <span className="text-lime">{row.action}</span>
                  {" · "}
                  {row.entity_type}/{row.entity_id.slice(0, 8)}
                </p>
                <p className="text-xs text-silver">
                  {row.actor_username ? `@${row.actor_username}` : "sistema"} ·{" "}
                  {new Date(row.created_at).toLocaleString("pt-BR")}
                </p>
              </li>
            ))}
          </ul>
        </GlassPanel>
      </div>
    </AdminShell>
  );
}
