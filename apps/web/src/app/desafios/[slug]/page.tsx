"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, type ApiUser, type Challenge } from "@/lib/api";
import { StatusBadge } from "@/components/challenge/StatusBadge";
import { Button } from "@/components/ui/Button";

export default function ChallengePublicPage() {
  const params = useParams<{ slug: string }>();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const ch = await api.challenge(params.slug);
      setChallenge(ch);
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro");
    }
  }

  useEffect(() => {
    load();
    api.me().then(setUser).catch(() => setUser(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug]);

  async function transition(status: string) {
    if (!challenge) return;
    setBusy(true);
    try {
      const updated = await api.transitionChallenge(challenge.slug, status);
      setChallenge(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro");
    } finally {
      setBusy(false);
    }
  }

  if (error && !challenge) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-28">
        <p className="text-red-400">{error}</p>
        <Button href="/desafios" className="mt-6" variant="ghost">
          Voltar
        </Button>
      </div>
    );
  }

  if (!challenge) {
    return <div className="px-6 py-28 text-center text-silver">Carregando...</div>;
  }

  const when = new Date(challenge.starts_at).toLocaleString("pt-BR", {
    dateStyle: "full",
    timeStyle: "short",
  });
  const isOwner = user?.id === challenge.created_by;
  const canPublish =
    isOwner &&
    challenge.status === "draft" &&
    user?.roles.some((r) => ["creator", "organizer", "admin"].includes(r));
  const canSubmit = isOwner && challenge.status === "draft";
  const canApprove =
    challenge.status === "pending_approval" &&
    user?.roles.some((r) => ["admin", "organizer"].includes(r));

  return (
    <div className="mx-auto max-w-3xl px-6 py-28">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs uppercase tracking-wider text-silver">
          {challenge.modality_name}
        </p>
        <StatusBadge status={challenge.status} derived={challenge.derived} />
      </div>
      <h1 className="mt-4 font-display text-5xl text-white md:text-6xl">
        {challenge.title}
      </h1>
      <p className="mt-2 text-silver">
        por @{challenge.creator_username} · {challenge.arena_name}
      </p>
      <p className="mt-8 whitespace-pre-wrap text-base leading-relaxed text-silver">
        {challenge.description || "Sem descrição."}
      </p>

      <dl className="mt-10 grid gap-4 border-t border-white/10 pt-8 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-silver">Quando</dt>
          <dd className="mt-1 text-white">{when}</dd>
        </div>
        <div>
          <dt className="text-silver">Tipo</dt>
          <dd className="mt-1 text-white">{challenge.competition_type}</dd>
        </div>
        <div>
          <dt className="text-silver">Vagas</dt>
          <dd className="mt-1 text-white">
            {challenge.confirmed_count}/{challenge.capacity}
          </dd>
        </div>
        <div>
          <dt className="text-silver">Regulamento</dt>
          <dd className="mt-1 text-white">{challenge.regulation || "—"}</dd>
        </div>
      </dl>

      {error && <p className="mt-6 text-sm text-red-400">{error}</p>}

      <div className="mt-10 flex flex-wrap gap-3">
        {canSubmit && (
          <Button disabled={busy} onClick={() => transition("pending_approval")}>
            Enviar para aprovação
          </Button>
        )}
        {canPublish && (
          <Button disabled={busy} onClick={() => transition("published")}>
            Publicar
          </Button>
        )}
        {canApprove && (
          <Button disabled={busy} onClick={() => transition("published")}>
            Aprovar e publicar
          </Button>
        )}
        <Button href="/desafios" variant="ghost">
          Ver todos
        </Button>
      </div>
    </div>
  );
}
