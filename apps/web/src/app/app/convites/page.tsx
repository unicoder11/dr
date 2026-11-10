"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Participant } from "@/lib/api";
import { Button } from "@/components/ui/Button";

export default function ConvitesPage() {
  const [items, setItems] = useState<Participant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const list = await api.myInvites();
    setItems(list);
  }

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "erro"));
  }, []);

  async function decline(id: string) {
    setBusy(id);
    setError(null);
    try {
      await api.declineInvite(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-28">
      <h1 className="font-display text-5xl text-white">Convites</h1>
      <p className="mt-2 text-silver">Pendentes de resposta.</p>
      {error && <p className="mt-6 text-red-400">{error}</p>}
      <ul className="mt-10 space-y-4">
        {items.length === 0 && !error && (
          <li className="text-silver">Nenhum convite pendente.</li>
        )}
        {items.map((inv) => {
          const when = inv.challenge_starts_at
            ? new Date(inv.challenge_starts_at).toLocaleString("pt-BR", {
                dateStyle: "medium",
                timeStyle: "short",
              })
            : "";
          return (
            <li key={inv.id} className="border border-white/10 p-5">
              <Link
                href={`/desafios/${inv.challenge_slug}`}
                className="font-display text-2xl text-white hover:text-lime"
              >
                {inv.challenge_title}
              </Link>
              <p className="mt-1 text-sm text-silver">{when}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button href={`/desafios/${inv.challenge_slug}/participar`}>
                  Aceitar e pagar
                </Button>
                <Button
                  disabled={busy === inv.id}
                  variant="ghost"
                  onClick={() => decline(inv.id)}
                >
                  Recusar
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
