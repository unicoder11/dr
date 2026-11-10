"use client";

import { useEffect, useState } from "react";
import { api, type Achievement } from "@/lib/api";
import { Button } from "@/components/ui/Button";

export default function ConquistasPage() {
  const [items, setItems] = useState<Achievement[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .myAchievements()
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : "erro"));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-6 py-28">
      <h1 className="font-display text-5xl text-white">Conquistas</h1>
      <p className="mt-2 text-silver">Medalhas e marcos da sua jornada.</p>
      {error && <p className="mt-4 text-red-400">{error}</p>}
      <ul className="mt-10 space-y-3">
        {items.length === 0 && !error && (
          <li className="text-silver">Ainda sem conquistas.</li>
        )}
        {items.map((a) => (
          <li key={a.slug} className="border border-white/10 p-4">
            <p className="text-xs uppercase tracking-wide text-lime">{a.icon}</p>
            <h2 className="mt-1 font-display text-2xl text-white">{a.name}</h2>
            <p className="text-sm text-silver">{a.description}</p>
            <p className="mt-2 text-xs text-silver">
              {new Date(a.earned_at).toLocaleString("pt-BR")}
            </p>
          </li>
        ))}
      </ul>
      <Button href="/app" variant="ghost" className="mt-8">
        Voltar ao hub
      </Button>
    </div>
  );
}
