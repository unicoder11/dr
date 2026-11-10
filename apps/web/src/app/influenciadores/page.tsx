"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type InfluencerRow } from "@/lib/api";
import { GlassPanel } from "@/components/ui/Glass";
import { GlassShell } from "@/components/layout/GlassShell";
import { PageHero } from "@/components/brand/PageHero";
import { brand } from "@/lib/brand";

export default function InfluenciadoresPage() {
  const [items, setItems] = useState<InfluencerRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .influencers()
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : "erro"));
  }, []);

  return (
    <GlassShell bg={brand.images.lounge}>
      <PageHero
        image={brand.images.lounge}
        eyebrow="CREATORS"
        title="Influenciadores"
        subtitle="Score = seguidores×3 + indicações×5 + views + publicados×2"
        priority
      />
      <GlassPanel className="mt-4 overflow-hidden p-5 md:p-7">
        {error && <p className="mb-4 text-red-400">{error}</p>}
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-black/40 text-silver">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Creator</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Seguidores</th>
                <th className="px-4 py-3">Indicações</th>
                <th className="px-4 py-3">Views</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-silver">
                    Sem dados ainda.
                  </td>
                </tr>
              )}
              {items.map((row, idx) => (
                <tr key={row.username} className="border-t border-white/10">
                  <td className="px-4 py-3 font-display text-lime">{idx + 1}</td>
                  <td className="px-4 py-3 text-white">
                    <Link href={`/u/${row.username}`} className="hover:text-lime">
                      {row.display_name}
                    </Link>
                    <div className="text-xs text-silver">@{row.username}</div>
                  </td>
                  <td className="px-4 py-3 text-white">{row.score}</td>
                  <td className="px-4 py-3 text-silver">{row.followers_count}</td>
                  <td className="px-4 py-3 text-silver">{row.referral_signups}</td>
                  <td className="px-4 py-3 text-silver">{row.total_views}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassPanel>
    </GlassShell>
  );
}
