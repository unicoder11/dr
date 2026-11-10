"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, type Arena, type Challenge, type Modality } from "@/lib/api";
import { ChallengeCard } from "@/components/challenge/ChallengeCard";
import { Button } from "@/components/ui/Button";
import { GlassPanel } from "@/components/ui/Glass";
import { GlassShell } from "@/components/layout/GlassShell";
import { PageHero } from "@/components/brand/PageHero";
import { brand } from "@/lib/brand";

export default function DesafiosPage() {
  return (
    <Suspense
      fallback={
        <GlassShell>
          <p className="text-center text-silver">Carregando...</p>
        </GlassShell>
      }
    >
      <DesafiosClient />
    </Suspense>
  );
}

function DesafiosClient() {
  const params = useSearchParams();
  const [items, setItems] = useState<Challenge[]>([]);
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [modality, setModality] = useState("");
  const [arena, setArena] = useState(params.get("arena") || "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.modalities().then(setModalities).catch(() => undefined);
    api.arenas().then(setArenas).catch(() => undefined);
  }, []);

  useEffect(() => {
    setArena(params.get("arena") || "");
  }, [params]);

  useEffect(() => {
    const m = params.get("modality");
    if (m) setModality(m);
  }, [params]);

  useEffect(() => {
    setLoading(true);
    api
      .challenges({
        modality: modality || undefined,
        arena: arena || undefined,
      })
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : "erro"))
      .finally(() => setLoading(false));
  }, [modality, arena]);

  return (
    <GlassShell bg={brand.images.challenge}>
      <PageHero
        image={brand.images.challenge}
        eyebrow="DR CHALLENGES"
        title="Desafios"
        subtitle="Marketplace multi-arena — filtre, entre e compete."
        priority
      />
      <GlassPanel className="mt-4 overflow-hidden p-5 md:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <FilterChip active={!arena} onClick={() => setArena("")}>
              Todas arenas
            </FilterChip>
            {arenas.map((a) => (
              <FilterChip key={a.id} active={arena === a.slug} onClick={() => setArena(a.slug)}>
                {a.name}
              </FilterChip>
            ))}
          </div>
          <Button href="/app/desafios/novo">Criar desafio</Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <FilterChip active={!modality} onClick={() => setModality("")}>
            Todas modalidades
          </FilterChip>
          {modalities.map((m) => (
            <FilterChip
              key={m.id}
              active={modality === m.slug}
              onClick={() => setModality(m.slug)}
            >
              {m.name}
            </FilterChip>
          ))}
        </div>
        {loading && <p className="mt-10 text-silver">Carregando...</p>}
        {error && <p className="mt-10 text-red-400">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <p className="mt-10 text-silver">Nenhum desafio publicado ainda.</p>
        )}
        <div className="mt-8 grid gap-4">
          {items.map((c) => (
            <ChallengeCard key={c.id} challenge={c} />
          ))}
        </div>
      </GlassPanel>
    </GlassShell>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm transition ${
        active
          ? "bg-lime font-semibold text-racing"
          : "border border-white/15 bg-white/5 text-silver hover:border-lime"
      }`}
    >
      {children}
    </button>
  );
}
