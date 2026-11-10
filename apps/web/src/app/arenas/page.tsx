"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { api, type Arena } from "@/lib/api";
import { GlassShell } from "@/components/layout/GlassShell";
import { PageHero } from "@/components/brand/PageHero";
import { brand } from "@/lib/brand";

const arenaArt: Record<string, string> = {
  "super-mountain-kart": brand.images.clubhouse,
  "dr-urban-circuit": brand.images.sunset,
};

export default function ArenasPage() {
  const [items, setItems] = useState<Arena[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .arenas()
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : "erro"));
  }, []);

  return (
    <GlassShell bg={brand.images.clubhouse}>
      <PageHero
        image={brand.images.clubhouse}
        eyebrow="DR ARENAS"
        title="Arenas"
        subtitle="Espaços físicos do ecossistema — pista, clubhouse e operação."
        priority
      />
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {error && <p className="text-red-400">{error}</p>}
        {items.map((a) => (
          <Link
            key={a.id}
            href={`/arenas/${a.slug}`}
            className="glass-card group relative block min-h-[380px] overflow-hidden"
          >
            <Image
              src={arenaArt[a.slug] || brand.images.sunset}
              alt=""
              fill
              className="object-cover transition duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-racing via-racing/50 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-lime">
                DR ARENA
              </p>
              <h2 className="mt-2 font-display text-3xl tracking-wide text-white md:text-4xl">
                {a.name}
              </h2>
              <p className="mt-2 line-clamp-2 text-sm text-silver">{a.description}</p>
              <p className="mt-4 text-xs text-silver">
                {a.open_slots ?? 0} slots · {a.upcoming_challenges ?? 0} desafios
              </p>
            </div>
          </Link>
        ))}
        {items.length === 0 && !error && (
          <p className="text-silver">Nenhuma arena publicada.</p>
        )}
      </div>
    </GlassShell>
  );
}
