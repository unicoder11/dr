"use client";

import { useEffect, useState } from "react";
import { api, type ApiUser, type CreatorStats } from "@/lib/api";
import { Button } from "@/components/ui/Button";

export default function CreatorStatsPage() {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .me()
      .then(async (u) => {
        setUser(u);
        const s = await api.creatorStats(u.username);
        setStats(s);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "erro"));
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-6 py-28 text-center">
        <p className="text-red-400">{error}</p>
        <Button href="/entrar" className="mt-6">
          Entrar
        </Button>
      </div>
    );
  }

  if (!stats || !user) {
    return <div className="px-6 py-28 text-center text-silver">Carregando...</div>;
  }

  const cards = [
    ["Seguidores", stats.followers_count],
    ["Desafios publicados", stats.challenges_published],
    ["Views", stats.total_views],
    ["Shares", stats.total_shares],
    ["Indicações", stats.referral_signups],
    ["Vitórias", stats.wins],
  ] as const;

  return (
    <div className="mx-auto max-w-4xl px-6 py-28">
      <p className="text-xs uppercase tracking-widest text-lime">Creator</p>
      <h1 className="mt-2 font-display text-5xl text-white">Suas métricas</h1>
      <p className="mt-2 text-silver">@{user.username}</p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, value]) => (
          <div key={label} className="border border-white/10 p-5">
            <p className="text-xs uppercase tracking-wide text-silver">{label}</p>
            <p className="mt-2 font-display text-4xl text-lime">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button href="/influenciadores" variant="ghost">
          Ranking de influenciadores
        </Button>
        <Button href={`/u/${user.username}`} variant="ghost">
          Ver perfil
        </Button>
      </div>
    </div>
  );
}
