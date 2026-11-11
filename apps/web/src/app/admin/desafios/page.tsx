"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AdminGate } from "@/components/admin/AdminGate";
import { AdminShell, AdminTable } from "@/components/admin/AdminShell";
import { StatusBadge } from "@/components/challenge/StatusBadge";
import { Button } from "@/components/ui/Button";
import { GlassPanel } from "@/components/ui/Glass";
import {
  api,
  type AdminChallenge,
  type AdminPotPreview,
  type Participant,
} from "@/lib/api";

const FILTERS = [
  { value: "", label: "Todos" },
  { value: "pending_approval", label: "Em aprovação" },
  { value: "published", label: "Publicados" },
  { value: "draft", label: "Rascunho" },
  { value: "in_progress", label: "Em andamento" },
  { value: "completed", label: "Finalizados" },
  { value: "cancelled", label: "Cancelados" },
];

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function AdminDesafiosPage() {
  return (
    <AdminGate>
      {() => (
        <Suspense fallback={<div className="px-6 py-28 text-center text-silver">Carregando…</div>}>
          <DesafiosPanel />
        </Suspense>
      )}
    </AdminGate>
  );
}

function DesafiosPanel() {
  const search = useSearchParams();
  const initial = search.get("status") || "";
  const [status, setStatus] = useState(initial);
  const [list, setList] = useState<AdminChallenge[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [settleFor, setSettleFor] = useState<AdminChallenge | null>(null);
  const [pot, setPot] = useState<AdminPotPreview | null>(null);
  const [candidates, setCandidates] = useState<{ id: string; label: string }[]>([]);
  const [winnerID, setWinnerID] = useState("");
  const [settleBusy, setSettleBusy] = useState(false);

  const load = useCallback(() => {
    return api
      .adminChallenges(status || undefined)
      .then(setList)
      .catch((e) => setError(e instanceof Error ? e.message : "erro"));
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  async function transition(slug: string, next: string) {
    setBusy(`${slug}:${next}`);
    try {
      await api.transitionChallenge(slug, next);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro");
    } finally {
      setBusy(null);
    }
  }

  async function openSettle(c: AdminChallenge) {
    setError(null);
    setSettleFor(c);
    setPot(null);
    setWinnerID("");
    setCandidates([]);
    try {
      const [preview, parts] = await Promise.all([
        api.adminPotPreview(c.slug),
        api.participants(c.slug),
      ]);
      setPot(preview);
      const opts: { id: string; label: string }[] = [
        {
          id: c.created_by || "",
          label: `Criador · @${c.creator_username}`,
        },
      ].filter((o) => o.id);
      const seen = new Set(opts.map((o) => o.id));
      (parts as Participant[])
        .filter((p) => p.status === "confirmed" || p.status === "checked_in")
        .forEach((p) => {
          if (!seen.has(p.user_id)) {
            seen.add(p.user_id);
            opts.push({
              id: p.user_id,
              label: `Participante · @${p.username}`,
            });
          }
        });
      setCandidates(opts);
      if (opts[0]) setWinnerID(opts[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro");
      setSettleFor(null);
    }
  }

  async function confirmSettle() {
    if (!settleFor || !winnerID) return;
    setSettleBusy(true);
    setError(null);
    try {
      await api.adminSettleChallenge(settleFor.slug, { winner_user_id: winnerID });
      setSettleFor(null);
      setPot(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro");
    } finally {
      setSettleBusy(false);
    }
  }

  const canSettle = (c: AdminChallenge) =>
    c.status === "published" || c.status === "in_progress" || c.status === "completed";

  return (
    <AdminShell
      title="Desafios"
      subtitle="Moderação, aprovação e liberação do pozo"
      actions={
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value || "all"}
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
        </div>
      }
    >
      {error && <p className="mb-4 text-red-400">{error}</p>}

      {settleFor && pot && (
        <GlassPanel className="mb-6 !rounded-2xl p-5">
          <h2 className="font-display text-2xl text-white">Liberar fundos · {settleFor.title}</h2>
          <p className="mt-1 text-sm text-silver">
            Ao finalizar, a plataforma fica com a taxa e o ganhador recebe o restante do pozo.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-silver">Pozo</p>
              <p className="font-display text-3xl text-white">{formatBRL(pot.pot_cents)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-silver">
                Taxa plataforma ({(pot.platform_fee_bps / 100).toFixed(1)}%)
              </p>
              <p className="font-display text-3xl text-lime">{formatBRL(pot.platform_fee_cents)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-silver">Ganhador</p>
              <p className="font-display text-3xl text-white">{formatBRL(pot.winner_payout_cents)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-silver">Composição</p>
              <p className="text-sm text-silver">
                criador {formatBRL(pot.creator_paid_cents)} · entradas{" "}
                {formatBRL(pot.entries_paid_cents)}
              </p>
            </div>
          </div>

          {pot.already_settled ? (
            <p className="mt-4 text-sm text-lime">Pozo já liberado para este desafio.</p>
          ) : (
            <>
              <label className="mt-5 block text-sm text-silver">
                Ganhador
                <select
                  value={winnerID}
                  onChange={(e) => setWinnerID(e.target.value)}
                  className="mt-1.5 w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-white outline-none focus:border-lime"
                >
                  {candidates.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  disabled={settleBusy || !winnerID || pot.pot_cents <= 0}
                  onClick={() => void confirmSettle()}
                >
                  {settleBusy ? "Liberando…" : "Finalizar e liberar"}
                </Button>
                <Button variant="ghost" onClick={() => setSettleFor(null)}>
                  Cancelar
                </Button>
              </div>
            </>
          )}
        </GlassPanel>
      )}

      <AdminTable>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/5 text-silver">
            <tr>
              <th className="px-4 py-3 font-medium">Desafio</th>
              <th className="px-4 py-3 font-medium">Modalidade</th>
              <th className="px-4 py-3 font-medium">Arena</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Quando</th>
              <th className="px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-silver">
                  Nenhum desafio neste filtro.
                </td>
              </tr>
            )}
            {list.map((c) => (
              <tr key={c.id} className="border-t border-white/10 align-top">
                <td className="px-4 py-3">
                  <Link href={`/desafios/${c.slug}`} className="text-white hover:text-lime">
                    {c.title}
                  </Link>
                  <div className="text-xs text-silver">@{c.creator_username}</div>
                </td>
                <td className="px-4 py-3 text-silver">{c.modality_name}</td>
                <td className="px-4 py-3 text-silver">{c.arena_name}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-4 py-3 text-xs text-silver">
                  {new Date(c.starts_at).toLocaleString("pt-BR")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {c.status === "pending_approval" && (
                      <>
                        <Button
                          className="!px-3 !py-1.5 text-xs"
                          disabled={busy === `${c.slug}:published`}
                          onClick={() => transition(c.slug, "published")}
                        >
                          Aprovar
                        </Button>
                        <Button
                          variant="ghost"
                          className="!px-3 !py-1.5 text-xs"
                          disabled={busy === `${c.slug}:cancelled`}
                          onClick={() => transition(c.slug, "cancelled")}
                        >
                          Rejeitar
                        </Button>
                      </>
                    )}
                    {c.status === "published" && (
                      <Button
                        variant="ghost"
                        className="!px-3 !py-1.5 text-xs"
                        disabled={busy === `${c.slug}:cancelled`}
                        onClick={() => transition(c.slug, "cancelled")}
                      >
                        Cancelar
                      </Button>
                    )}
                    {canSettle(c) && (
                      <Button
                        className="!px-3 !py-1.5 text-xs"
                        onClick={() => void openSettle(c)}
                      >
                        Liberar pozo
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTable>
    </AdminShell>
  );
}
