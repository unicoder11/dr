"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminGate } from "@/components/admin/AdminGate";
import { AdminShell, AdminStat, AdminTable } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/Button";
import {
  api,
  type AdminFinanceOverview,
  type AdminPayment,
} from "@/lib/api";

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const KIND_FILTERS = [
  { value: "", label: "Todos" },
  { value: "submission", label: "Criação" },
  { value: "entry", label: "Participação" },
  { value: "booking", label: "Reservas" },
];

const STATUS_FILTERS = [
  { value: "", label: "Qualquer status" },
  { value: "paid", label: "Pago" },
  { value: "pending", label: "Pendente" },
  { value: "pending_payment", label: "Aguardando (reserva)" },
  { value: "confirmed", label: "Confirmado (reserva)" },
  { value: "refunded", label: "Reembolsado" },
  { value: "failed", label: "Falhou" },
  { value: "cancelled", label: "Cancelado" },
];

const METHOD_FILTERS = [
  { value: "", label: "Método" },
  { value: "pix", label: "Pix" },
  { value: "card", label: "Cartão" },
  { value: "waived", label: "Isento" },
  { value: "mercadopago", label: "Mercado Pago" },
];

const KIND_LABEL: Record<string, string> = {
  submission: "Criação",
  entry: "Participação",
  booking: "Reserva",
};

const STATUS_STYLE: Record<string, string> = {
  paid: "border-lime/40 bg-lime/10 text-lime",
  confirmed: "border-lime/40 bg-lime/10 text-lime",
  checked_in: "border-lime/40 bg-lime/10 text-lime",
  completed: "border-lime/40 bg-lime/10 text-lime",
  pending: "border-amber-400/40 bg-amber-400/10 text-amber-200",
  pending_payment: "border-amber-400/40 bg-amber-400/10 text-amber-200",
  refunded: "border-sky-400/40 bg-sky-400/10 text-sky-200",
  failed: "border-red-400/40 bg-red-400/10 text-red-300",
  cancelled: "border-white/20 bg-white/5 text-silver",
};

function PaymentStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-sm border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
        STATUS_STYLE[status] || "border-white/20 bg-white/5 text-silver"
      }`}
    >
      {status}
    </span>
  );
}

export default function AdminFinanceiroPage() {
  return (
    <AdminGate>
      {() => <FinanceiroPanel />}
    </AdminGate>
  );
}

function FinanceiroPanel() {
  const [overview, setOverview] = useState<AdminFinanceOverview | null>(null);
  const [list, setList] = useState<AdminPayment[]>([]);
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");
  const [method, setMethod] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    return Promise.all([
      api.adminFinanceOverview(),
      api.adminFinancePayments({
        kind: kind || undefined,
        status: status || undefined,
        method: method || undefined,
      }),
    ])
      .then(([o, payments]) => {
        setOverview(o);
        setList(payments);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "erro"));
  }, [kind, status, method]);

  useEffect(() => {
    load();
  }, [load]);

  async function refund(p: AdminPayment) {
    if (p.kind !== "submission" && p.kind !== "entry") return;
    if (!window.confirm(`Marcar reembolso de ${formatBRL(p.amount_cents)}?`)) return;
    setBusy(p.id);
    try {
      await api.adminSetPaymentStatus(p.kind, p.id, "refunded");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminShell
      title="Financeiro"
      subtitle="Pagamentos de criação, participação e reservas · estados e GMV"
    >
      {error && <p className="mb-4 text-red-400">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStat
          label="Recebido"
          value={overview ? formatBRL(overview.paid_cents) : "—"}
          hint={`${overview?.paid_count ?? 0} pagamentos`}
        />
        <AdminStat
          label="Pendente"
          value={overview ? formatBRL(overview.pending_cents) : "—"}
          hint={`${overview?.pending_count ?? 0} em aberto`}
        />
        <AdminStat
          label="Reembolsado"
          value={overview ? formatBRL(overview.refunded_cents) : "—"}
          hint={`${overview?.refunded_count ?? 0} · ${overview?.failed_count ?? 0} falhas`}
        />
        <AdminStat
          label="Últimos 7 dias"
          value={overview ? formatBRL(overview.last_7d_paid_cents) : "—"}
          hint="pago / confirmado"
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <AdminStat
          label="Criação de desafios"
          value={
            overview
              ? formatBRL(overview.by_kind_paid_cents?.submission ?? 0)
              : "—"
          }
        />
        <AdminStat
          label="Participações"
          value={
            overview ? formatBRL(overview.by_kind_paid_cents?.entry ?? 0) : "—"
          }
        />
        <AdminStat
          label="Reservas"
          value={
            overview
              ? formatBRL(overview.by_kind_paid_cents?.booking ?? 0)
              : "—"
          }
        />
      </div>

      {(overview?.by_method_paid_cents &&
        Object.keys(overview.by_method_paid_cents).length > 0) && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-silver">
          {Object.entries(overview.by_method_paid_cents).map(([m, cents]) => (
            <span
              key={m}
              className="rounded-full border border-white/15 px-3 py-1"
            >
              {m}: <span className="text-white">{formatBRL(cents)}</span>
            </span>
          ))}
        </div>
      )}

      <div className="mt-6 mb-3 flex flex-wrap gap-2">
        {KIND_FILTERS.map((f) => (
          <button
            key={f.value || "all-kind"}
            type="button"
            onClick={() => setKind(f.value)}
            className={`rounded-full px-3 py-1.5 text-xs transition ${
              kind === f.value
                ? "bg-lime/20 font-semibold text-lime"
                : "border border-white/15 text-silver hover:text-white"
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="mx-1 hidden h-6 w-px bg-white/15 sm:inline-block" />
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value || "all-status"}
            type="button"
            onClick={() => setStatus(f.value)}
            className={`rounded-full px-3 py-1.5 text-xs transition ${
              status === f.value
                ? "bg-lime/20 font-semibold text-lime"
                : "border border-white/15 text-silver hover:text-white"
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="mx-1 hidden h-6 w-px bg-white/15 sm:inline-block" />
        {METHOD_FILTERS.map((f) => (
          <button
            key={f.value || "all-method"}
            type="button"
            onClick={() => setMethod(f.value)}
            className={`rounded-full px-3 py-1.5 text-xs transition ${
              method === f.value
                ? "bg-lime/20 font-semibold text-lime"
                : "border border-white/15 text-silver hover:text-white"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <AdminTable>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/5 text-silver">
            <tr>
              <th className="px-4 py-3 font-medium">Quando</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Usuário</th>
              <th className="px-4 py-3 font-medium">Referência</th>
              <th className="px-4 py-3 font-medium">Método</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-silver">
                  Nenhum pagamento neste filtro.
                </td>
              </tr>
            )}
            {list.map((p) => (
              <tr key={`${p.kind}-${p.id}`} className="border-t border-white/10 align-top">
                <td className="px-4 py-3 text-xs text-silver whitespace-nowrap">
                  {new Date(p.created_at).toLocaleString("pt-BR")}
                </td>
                <td className="px-4 py-3 text-white">
                  {KIND_LABEL[p.kind] || p.kind}
                </td>
                <td className="px-4 py-3">
                  <div className="text-white">
                    {p.username ? `@${p.username}` : "—"}
                  </div>
                  <div className="text-xs text-silver">{p.email}</div>
                </td>
                <td className="px-4 py-3">
                  {p.challenge_slug ? (
                    <Link
                      href={`/desafios/${p.challenge_slug}`}
                      className="text-white hover:text-lime"
                    >
                      {p.challenge_title || p.challenge_slug}
                    </Link>
                  ) : (
                    <span className="text-silver">{p.arena_name || "—"}</span>
                  )}
                  {p.provider_payment_id && (
                    <div className="mt-0.5 max-w-[180px] truncate text-[10px] text-silver">
                      {p.provider_payment_id}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-silver">{p.method}</td>
                <td className="px-4 py-3">
                  <PaymentStatusBadge status={p.status} />
                </td>
                <td className="px-4 py-3 font-medium text-white whitespace-nowrap">
                  {formatBRL(p.amount_cents)}
                </td>
                <td className="px-4 py-3">
                  {p.can_refund && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="!px-3 !py-1 text-xs"
                      disabled={busy === p.id}
                      onClick={() => refund(p)}
                    >
                      {busy === p.id ? "…" : "Reembolsar"}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTable>
    </AdminShell>
  );
}
