"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  api,
  type ChallengeResult,
  type Participant,
} from "@/lib/api";
import { Button } from "@/components/ui/Button";

export default function OpsResultadosPage() {
  const params = useParams<{ slug: string }>();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [result, setResult] = useState<ChallengeResult | null>(null);
  const [positions, setPositions] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const parts = await api.participants(params.slug);
    setParticipants(parts.filter((p) => ["confirmed", "checked_in", "invited"].includes(p.status)));
    try {
      const res = await api.challengeResult(params.slug);
      setResult(res);
      const map: Record<string, string> = {};
      for (const p of res.payload.placements) {
        map[p.user_id] = String(p.position);
      }
      setPositions(map);
    } catch {
      setResult(null);
    }
  }

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "erro"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const placements = participants
        .map((p) => ({
          user_id: p.user_id,
          position: Number(positions[p.user_id] || 0),
        }))
        .filter((p) => p.position > 0)
        .sort((a, b) => a.position - b.position);
      const res = await api.opsUpsertResult(params.slug, { placements });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "erro");
    } finally {
      setBusy(false);
    }
  }

  async function onValidate() {
    if (!result) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.opsValidateResult(result.id);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "erro");
    } finally {
      setBusy(false);
    }
  }

  async function checkIn(participantId: string) {
    setBusy(true);
    try {
      await api.opsCheckIn({ participant_id: participantId });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "erro");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-28">
      <h1 className="font-display text-5xl text-white">Resultados</h1>
      <p className="mt-2 text-silver">/{params.slug}</p>
      {result && (
        <p className="mt-4 text-sm text-lime">Status resultado: {result.status}</p>
      )}
      {error && <p className="mt-4 text-red-400">{error}</p>}

      <form onSubmit={onSave} className="mt-8 space-y-4">
        {participants.map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-3 border border-white/10 px-4 py-3"
          >
            <div>
              <p className="text-white">
                {p.display_name} <span className="text-silver">@{p.username}</span>
              </p>
              <p className="text-xs text-lime">{p.status}</p>
            </div>
            <div className="flex items-center gap-2">
              {p.status === "confirmed" && (
                <Button
                  type="button"
                  variant="ghost"
                  className="!px-3 !py-2 text-xs"
                  disabled={busy}
                  onClick={() => checkIn(p.id)}
                >
                  Check-in
                </Button>
              )}
              <input
                type="number"
                min={1}
                placeholder="pos"
                value={positions[p.user_id] || ""}
                onChange={(e) =>
                  setPositions((prev) => ({ ...prev, [p.user_id]: e.target.value }))
                }
                className="w-20 rounded-sm border border-white/15 bg-graphite px-2 py-2 text-white outline-none focus:border-lime"
              />
            </div>
          </div>
        ))}
        <div className="flex flex-wrap gap-3 pt-4">
          <Button type="submit" disabled={busy}>
            Salvar rascunho
          </Button>
          {result && result.status === "draft" && (
            <Button type="button" variant="ghost" disabled={busy} onClick={onValidate}>
              Validar e atualizar ranking
            </Button>
          )}
          <Button href="/ops" variant="ghost">
            Voltar
          </Button>
        </div>
      </form>
    </div>
  );
}
