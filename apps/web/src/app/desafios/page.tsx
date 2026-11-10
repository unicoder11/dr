"use client";

import { useEffect, useState } from "react";
import { api, type Challenge, type Modality } from "@/lib/api";
import { ChallengeCard } from "@/components/challenge/ChallengeCard";
import { Button } from "@/components/ui/Button";

export default function DesafiosPage() {
  const [items, setItems] = useState<Challenge[]>([]);
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [modality, setModality] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.modalities().then(setModalities).catch(() => undefined);
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .challenges({ modality: modality || undefined })
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : "erro"))
      .finally(() => setLoading(false));
  }, [modality]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-28">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-5xl text-white">Desafios</h1>
          <p className="mt-2 text-silver">Marketplace da Super Mountain Kart.</p>
        </div>
        <Button href="/app/desafios/novo">Criar desafio</Button>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        <FilterChip active={!modality} onClick={() => setModality("")}>
          Todas
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
    </div>
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
      className={`rounded-sm px-3 py-1.5 text-sm ${
        active ? "bg-lime text-racing" : "border border-white/15 text-silver hover:border-lime"
      }`}
    >
      {children}
    </button>
  );
}
