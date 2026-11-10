"use client";

import { useEffect, useState } from "react";
import { AdminGate } from "@/components/admin/AdminGate";
import { AdminShell, AdminStat } from "@/components/admin/AdminShell";
import { GlassPanel } from "@/components/ui/Glass";
import { api, type AdminOverview, type AdminFinanceOverview } from "@/lib/api";

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function AdminRelatoriosPage() {
  return (
    <AdminGate>
      {() => <RelatoriosPanel />}
    </AdminGate>
  );
}

function RelatoriosPanel() {
  const [o, setO] = useState<AdminOverview | null>(null);
  const [f, setF] = useState<AdminFinanceOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.adminOverview(), api.adminFinanceOverview()])
      .then(([ov, fin]) => {
        setO(ov);
        setF(fin);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "erro"));
  }, []);

  const conversion =
    o && o.challenges_published + o.challenges_pending > 0
      ? Math.round(
          (o.challenges_published /
            (o.challenges_published + o.challenges_pending)) *
            100,
        )
      : 0;

  return (
    <AdminShell
      title="Relatórios"
      subtitle="KPIs operacionais do MVP (snapshot ao vivo)"
    >
      {error && <p className="mb-4 text-red-400">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <AdminStat label="Contas" value={o?.users_total ?? "—"} hint="users_total" />
        <AdminStat
          label="Desafios publicados"
          value={o?.challenges_published ?? "—"}
          hint="published + in_progress"
        />
        <AdminStat
          label="Taxa draft→live (aprox.)"
          value={o ? `${conversion}%` : "—"}
          hint="published / (published + pending)"
        />
        <AdminStat
          label="Reservas confirmadas"
          value={o?.bookings_confirmed ?? "—"}
        />
        <AdminStat label="Slots abertos" value={o?.open_slots ?? "—"} />
        <AdminStat label="Arenas ativas" value={o?.arenas_published ?? "—"} />
        <AdminStat
          label="GMV pago"
          value={f ? formatBRL(f.paid_cents) : "—"}
          hint={`${f?.paid_count ?? 0} txs`}
        />
        <AdminStat
          label="GMV 7 dias"
          value={f ? formatBRL(f.last_7d_paid_cents) : "—"}
        />
        <AdminStat
          label="Pendente / reembolsado"
          value={
            f
              ? `${formatBRL(f.pending_cents)} / ${formatBRL(f.refunded_cents)}`
              : "—"
          }
        />
      </div>

      <GlassPanel className="mt-6 !rounded-2xl p-5">
        <h2 className="font-display text-2xl text-white">Notas</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-silver">
          <li>
            Detalhe de pagamentos e reembolsos manuais:{" "}
            <a href="/admin/financeiro" className="text-lime hover:underline">
              /admin/financeiro
            </a>
            .
          </li>
          <li>
            Settlements Mercado Pago (split/repasse) entram após webhook estável.
          </li>
          <li>
            Share rate e tempo até 1ª reserva exigem eventos de analytics
            agregados (Fase 5).
          </li>
        </ul>
      </GlassPanel>
    </AdminShell>
  );
}
