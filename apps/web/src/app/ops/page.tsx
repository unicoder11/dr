"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type OpsAgendaItem } from "@/lib/api";
import { Button } from "@/components/ui/Button";

export default function OpsPage() {
  const [items, setItems] = useState<OpsAgendaItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const list = await api.opsAgenda();
    setItems(list);
  }

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "erro"));
  }, []);

  if (error === "forbidden" || error === "unauthorized" || error === "http_401") {
    return (
      <div className="mx-auto max-w-lg px-6 py-32 text-center">
        <p className="text-silver">
          Acesso ops requer role admin, organizer ou arena_operator.
        </p>
        <Button href="/entrar" className="mt-6">
          Entrar
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-28">
      <h1 className="font-display text-5xl text-white">Ops</h1>
      <p className="mt-2 text-silver">Agenda do dia · check-in · resultados.</p>
      {error && <p className="mt-4 text-red-400">{error}</p>}

      <ul className="mt-10 space-y-4">
        {items.length === 0 && !error && (
          <li className="text-silver">Nada agendado para hoje.</li>
        )}
        {items.map((it) => {
          const when = new Date(it.starts_at).toLocaleString("pt-BR", {
            timeStyle: "short",
            dateStyle: "short",
          });
          return (
            <li key={`${it.kind}-${it.id}`} className="border border-white/10 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-lime">{it.kind}</p>
                  <h2 className="mt-1 font-display text-2xl text-white">{it.title}</h2>
                  <p className="mt-1 text-sm text-silver">
                    {when} · {it.status}
                    {it.username ? ` · @${it.username}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {it.kind === "booking" && it.status === "confirmed" && (
                    <Button
                      disabled={busy === it.id}
                      className="!px-3 !py-2 text-xs"
                      onClick={async () => {
                        setBusy(it.id);
                        try {
                          await api.opsCheckIn({ booking_id: it.id });
                          await load();
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "erro");
                        } finally {
                          setBusy(null);
                        }
                      }}
                    >
                      Check-in
                    </Button>
                  )}
                  {it.kind === "challenge" && it.slug && (
                    <>
                      {it.status === "published" && (
                        <Button
                          disabled={busy === it.id}
                          className="!px-3 !py-2 text-xs"
                          onClick={async () => {
                            setBusy(it.id);
                            try {
                              await api.opsStartChallenge(it.slug!);
                              await load();
                            } catch (e) {
                              setError(e instanceof Error ? e.message : "erro");
                            } finally {
                              setBusy(null);
                            }
                          }}
                        >
                          Iniciar
                        </Button>
                      )}
                      <Link
                        href={`/ops/resultados/${it.slug}`}
                        className="inline-flex items-center rounded-sm border border-white/20 px-3 py-2 text-xs text-white hover:border-lime hover:text-lime"
                      >
                        Resultados
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
