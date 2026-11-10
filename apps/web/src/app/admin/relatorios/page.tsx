"use client";

import { useEffect, useState } from "react";
import { AdminGate } from "@/components/admin/AdminGate";
import { AdminShell, AdminStat } from "@/components/admin/AdminShell";
import { GlassPanel } from "@/components/ui/Glass";
import { api, type AdminOverview } from "@/lib/api";

export default function AdminRelatoriosPage() {
  return (
    <AdminGate>
      {() => <RelatoriosPanel />}
    </AdminGate>
  );
}

function RelatoriosPanel() {
  const [o, setO] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .adminOverview()
      .then(setO)
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
      </div>

      <GlassPanel className="mt-6 !rounded-2xl p-5">
        <h2 className="font-display text-2xl text-white">Notas</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-silver">
          <li>
            Relatórios financeiros detalhados (GMV, MP settlements) entram após
            webhook de pagamento estável.
          </li>
          <li>
            Share rate e tempo até 1ª reserva exigem eventos de analytics
            agregados (Fase 5).
          </li>
          <li>Este painel usa o mesmo overview da API admin — sem cache.</li>
        </ul>
      </GlassPanel>
    </AdminShell>
  );
}
