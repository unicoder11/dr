"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, type Arena, type Challenge } from "@/lib/api";
import { BookingWidget } from "@/components/booking/BookingWidget";
import { ChallengeCard } from "@/components/challenge/ChallengeCard";
import { Button } from "@/components/ui/Button";

export default function ArenaDetailPage() {
  const params = useParams<{ slug: string }>();
  const [arena, setArena] = useState<Arena | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .arena(params.slug)
      .then(async (a) => {
        setArena(a);
        const list = await api.challenges({ arena: a.slug });
        setChallenges(list);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "erro"));
  }, [params.slug]);

  if (error && !arena) {
    return (
      <div className="mx-auto max-w-lg px-6 py-28 text-center">
        <p className="text-red-400">{error}</p>
        <Button href="/arenas" className="mt-6" variant="ghost">
          Voltar
        </Button>
      </div>
    );
  }

  if (!arena) {
    return <div className="px-6 py-28 text-center text-silver">Carregando...</div>;
  }

  const address =
    arena.address && typeof arena.address === "object"
      ? (arena.address as Record<string, string>)
      : {};

  return (
    <div className="mx-auto max-w-5xl px-6 py-28">
      <p className="text-xs uppercase tracking-widest text-lime">DR ARENA</p>
      <h1 className="mt-2 font-display text-5xl text-white md:text-6xl">{arena.name}</h1>
      <p className="mt-4 max-w-2xl text-silver">{arena.description}</p>
      {(address.city || address.state) && (
        <p className="mt-2 text-sm text-silver">
          {[address.city, address.state].filter(Boolean).join(" · ")}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {(arena.modalities || []).map((m) => (
          <span
            key={m.id}
            className="rounded-sm border border-lime/30 px-3 py-1 text-xs text-lime"
          >
            {m.name}
          </span>
        ))}
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <BookingWidget arenaSlug={arena.slug} />
        <div>
          <h2 className="font-display text-3xl text-white">Desafios nesta arena</h2>
          <div className="mt-6 space-y-4">
            {challenges.length === 0 && (
              <p className="text-sm text-silver">Nenhum desafio publicado aqui.</p>
            )}
            {challenges.slice(0, 5).map((c) => (
              <ChallengeCard key={c.id} challenge={c} />
            ))}
          </div>
          <Link href={`/desafios?arena=${arena.slug}`} className="mt-4 inline-block text-sm text-lime">
            Ver todos →
          </Link>
        </div>
      </div>
    </div>
  );
}
