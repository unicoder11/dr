"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AdminGate } from "@/components/admin/AdminGate";
import { AdminShell, AdminTable } from "@/components/admin/AdminShell";
import { StatusBadge } from "@/components/challenge/StatusBadge";
import { Button } from "@/components/ui/Button";
import { api, type AdminChallenge } from "@/lib/api";

const FILTERS = [
  { value: "", label: "Todos" },
  { value: "pending_approval", label: "Em aprovação" },
  { value: "published", label: "Publicados" },
  { value: "draft", label: "Rascunho" },
  { value: "in_progress", label: "Em andamento" },
  { value: "completed", label: "Finalizados" },
  { value: "cancelled", label: "Cancelados" },
];

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

  return (
    <AdminShell
      title="Desafios"
      subtitle="Moderação, aprovação e status"
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
