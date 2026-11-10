"use client";

import { useEffect, useState } from "react";
import { api, type Modality, type RankingEntry } from "@/lib/api";

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
    <div className="mx-auto max-w-4xl px-6 py-28">
      <h1 className="font-display text-5xl text-white">Rankings</h1>
      <p className="mt-2 text-silver">Temporada atual · pontos por modalidade.</p>

      <div className="mt-8 flex flex-wrap gap-2">
        <Chip active={modality === "geral"} onClick={() => setModality("geral")}>
          Geral
        </Chip>
        {modalities.map((m) => (
          <Chip
            key={m.id}
            active={modality === m.slug}
            onClick={() => setModality(m.slug)}
          >
            {m.name}
          </Chip>
        ))}
      </div>

      {error && <p className="mt-6 text-red-400">{error}</p>}

      <div className="mt-8 overflow-x-auto border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-graphite text-silver">
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
                <td className="px-4 py-3 text-lime">{row.rank_position || "—"}</td>
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
    </div>
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
      className={`rounded-sm px-3 py-1.5 text-sm ${
        active ? "bg-lime text-racing" : "border border-white/15 text-silver hover:border-lime"
      }`}
    >
      {children}
    </button>
  );
}
