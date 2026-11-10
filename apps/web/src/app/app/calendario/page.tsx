"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type CalendarItem } from "@/lib/api";
import { Button } from "@/components/ui/Button";

export default function CalendarioPage() {
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .calendar()
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : "erro"));
  }, []);

  if (error === "unauthorized" || error === "http_401") {
    return (
      <div className="mx-auto max-w-lg px-6 py-32 text-center">
        <p className="text-silver">Faça login para ver sua agenda.</p>
        <Button href="/entrar" className="mt-6">
          Entrar
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-28">
      <h1 className="font-display text-5xl text-white">Calendário</h1>
      <p className="mt-2 text-silver">Seus desafios e convites confirmados.</p>
      {error && <p className="mt-6 text-red-400">{error}</p>}
      <ul className="mt-10 space-y-4">
        {items.length === 0 && !error && (
          <li className="text-silver">Agenda vazia por enquanto.</li>
        )}
        {items.map((item) => {
          const when = new Date(item.starts_at).toLocaleString("pt-BR", {
            dateStyle: "medium",
            timeStyle: "short",
          });
          return (
            <li key={`${item.challenge_id}-${item.role}`}>
              <Link
                href={`/desafios/${item.slug}`}
                className="block border border-white/10 p-5 transition hover:border-lime"
              >
                <div className="flex justify-between gap-3 text-xs uppercase tracking-wide text-silver">
                  <span>{item.modality_name}</span>
                  <span>{item.role}</span>
                </div>
                <h2 className="mt-2 font-display text-2xl text-white">{item.title}</h2>
                <p className="mt-2 text-sm text-silver">
                  {when} · {item.arena_name} · {item.confirmed_count}/{item.capacity}
                </p>
                <p className="mt-1 text-xs text-lime">
                  {item.challenge_status}
                  {item.participant_status ? ` · ${item.participant_status}` : ""}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
