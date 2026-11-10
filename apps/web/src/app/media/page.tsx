"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type LiveStream } from "@/lib/api";
import { GlassShell } from "@/components/layout/GlassShell";
import { PageHero } from "@/components/brand/PageHero";
import { brand } from "@/lib/brand";

export default function MediaHubPage() {
  const [items, setItems] = useState<LiveStream[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .liveStreams()
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : "erro"));
  }, []);

  return (
    <GlassShell bg={brand.images.winners}>
      <PageHero
        image={brand.images.winners}
        eyebrow="DR MEDIA"
        title="Media & Live"
        subtitle="Transmissões e highlights das arenas."
        priority
      />
      {error && <p className="mt-4 text-red-400">{error}</p>}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {items.map((ls) => (
          <article key={ls.id} className="glass-card overflow-hidden">
            {ls.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ls.cover_url} alt="" className="h-44 w-full object-cover" />
            ) : (
              <div className="flex h-44 items-center justify-center bg-gradient-to-br from-racing via-graphite to-black">
                <span className="font-display text-3xl tracking-widest text-lime/80">LIVE</span>
              </div>
            )}
            <div className="p-5">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.3em]">
                <StatusDot status={ls.status} />
                <span className="text-silver">{ls.status}</span>
                {ls.is_demo && <span className="text-lime">demo</span>}
              </div>
              <h2 className="mt-2 font-display text-2xl tracking-wide text-white">{ls.title}</h2>
              <p className="mt-2 text-sm text-silver">{ls.description}</p>
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-silver">
                {ls.arena_name && (
                  <Link href={`/arenas/${ls.arena_slug}`} className="text-lime">
                    {ls.arena_name}
                  </Link>
                )}
                {ls.starts_at && (
                  <span>
                    {new Date(ls.starts_at).toLocaleString("pt-BR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
      {items.length === 0 && !error && (
        <p className="mt-8 text-silver">Nenhuma transmissão listada.</p>
      )}
    </GlassShell>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "live" ? "bg-red-500" : status === "scheduled" ? "bg-lime" : "bg-silver";
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}
