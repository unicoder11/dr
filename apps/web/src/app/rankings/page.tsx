"use client";

import { useEffect, useState } from "react";
import { api, type Modality, type RankingEntry } from "@/lib/api";
import { GlassPanel } from "@/components/ui/Glass";
import { GlassShell } from "@/components/layout/GlassShell";
import { PageHero } from "@/components/brand/PageHero";
import { brand } from "@/lib/brand";

export default function RankingsPage() {
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [modality, setModality] = useState("geral");
  const [items, setItems] = useState<RankingEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.modalities().then(setModalities).catch(() => undefined);
  }, []);

  useEffect(() => {
    api
      .rankings({ modality: modality === "geral" ? undefined : modality })
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : "erro"));
  }, [modality]);

  return (
    <GlassShell bg={brand.images.winners}>
      <PageHero
        image={brand.images.winners}
        eyebrow="STANDINGS"
        title="Rankings"
        subtitle="Temporada atual · pontos por modalidade."
        priority
      />
      <GlassPanel className="mt-4 overflow-hidden p-5 md:p-7">
        <div className="flex flex-wrap gap-2">
          <Chip active={modality === "geral"} onClick={() => setModality("geral")}>
            Geral
          </Chip>
          {modalities.map((m) => (
            <Chip key={m.id} active={modality === m.slug} onClick={() => setModality(m.slug)}>
              {m.name}
            </Chip>
          ))}
        </div>
        {error && <p className="mt-6 text-red-400">{error}</p>}
        <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-black/40 text-silver">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Atleta</th>
                <th className="px-4 py-3">Pontos</th>
                <th className="px-4 py-3">Vitórias</th>
                <th className="px-4 py-3">Participações</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-silver" colSpan={5}>
                    Sem ranking ainda. Valide resultados no painel ops.
                  </td>
                </tr>
              )}
              {items.map((row) => (
                <tr key={row.user_id} className="border-t border-white/10">
                  <td className="px-4 py-3 font-display text-lime">{row.rank_position || "—"}</td>
                  <td className="px-4 py-3 text-white">
                    {row.display_name}
                    <div className="text-xs text-silver">@{row.username}</div>
                  </td>
                  <td className="px-4 py-3 text-white">{row.points}</td>
                  <td className="px-4 py-3 text-silver">{row.wins}</td>
                  <td className="px-4 py-3 text-silver">{row.participations}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassPanel>
    </GlassShell>
  );
}

function Chip({
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
