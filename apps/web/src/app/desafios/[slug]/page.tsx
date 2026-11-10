"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  api,
  type ApiUser,
  type Challenge,
  type Participant,
} from "@/lib/api";
import { StatusBadge } from "@/components/challenge/StatusBadge";
import { Button } from "@/components/ui/Button";

export default function ChallengePublicPage() {
  const params = useParams<{ slug: string }>();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [inviteUser, setInviteUser] = useState("");
  const [coverBusy, setCoverBusy] = useState(false);

  async function load() {
    const ch = await api.challenge(params.slug);
    setChallenge(ch);
    const parts = await api.participants(params.slug);
    setParticipants(parts);
  }

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "erro"));
    api.me().then(setUser).catch(() => setUser(null));
    const key =
      typeof window !== "undefined"
        ? localStorage.getItem("dr_viewer_key") ||
          (() => {
            const k = crypto.randomUUID();
            localStorage.setItem("dr_viewer_key", k);
            return k;
          })()
        : "";
    api.trackView(params.slug, key).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug]);

  async function transition(status: string) {
    if (!challenge) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await api.transitionChallenge(challenge.slug, status);
      setChallenge(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro");
    } finally {
      setBusy(false);
    }
  }

  async function join() {
    if (!challenge) return;
    if (!user) {
      window.location.href = "/entrar";
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.joinChallenge(challenge.slug);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro");
    } finally {
      setBusy(false);
    }
  }

  async function onInvite(e: FormEvent) {
    e.preventDefault();
    if (!challenge || !inviteUser.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.invite(challenge.slug, inviteUser.trim());
      setInviteUser("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "erro");
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
  const myPart = participants.find((p) => p.user_id === user?.id);
  const canPublish =
    isOwner &&
    challenge.status === "draft" &&
    user?.roles.some((r) => ["creator", "organizer", "admin"].includes(r));
  const canSubmit = isOwner && challenge.status === "draft";
  const canApprove =
    challenge.status === "pending_approval" &&
    user?.roles.some((r) => ["admin", "organizer"].includes(r));
  const canJoin =
    challenge.status === "published" &&
    challenge.derived.open &&
    !myPart;

  async function onCoverChange(file: File | null) {
    if (!challenge || !file) return;
    setCoverBusy(true);
    setError(null);
    try {
      const asset = await api.uploadMedia(file, "cover", challenge.title);
      const updated = await api.setChallengeCover(challenge.slug, asset.id);
      setChallenge(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro");
    } finally {
      setCoverBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-28">
      {challenge.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={challenge.cover_url}
          alt=""
          className="mb-8 aspect-[21/9] w-full object-cover"
        />
      ) : null}
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

      <section className="mt-10 border-t border-white/10 pt-8">
        <h2 className="font-display text-2xl text-white">Participantes</h2>
        <ul className="mt-4 space-y-2">
          {participants.length === 0 && (
            <li className="text-sm text-silver">Ninguém inscrito ainda.</li>
          )}
          {participants.map((p) => (
            <li key={p.id} className="flex justify-between text-sm text-silver">
              <span>
                {p.display_name} <span className="text-white">@{p.username}</span>
              </span>
              <span className="text-lime">{p.status}</span>
            </li>
          ))}
        </ul>
      </section>

      {isOwner && (
        <label className="mt-8 block text-sm text-silver">
          {coverBusy ? "Enviando capa..." : "Atualizar capa"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={coverBusy}
            onChange={(e) => onCoverChange(e.target.files?.[0] || null)}
            className="mt-1 block w-full text-sm text-silver file:mr-3 file:rounded-sm file:border-0 file:bg-lime file:px-3 file:py-1.5 file:font-semibold file:text-racing"
          />
        </label>
      )}

      {isOwner && challenge.status === "published" && (
        <form onSubmit={onInvite} className="mt-8 flex flex-wrap gap-3">
          <input
            value={inviteUser}
            onChange={(e) => setInviteUser(e.target.value)}
            placeholder="username para convidar"
            className="min-w-[200px] flex-1 rounded-sm border border-white/15 bg-graphite px-3 py-2 text-white outline-none focus:border-lime"
          />
          <Button type="submit" disabled={busy} variant="ghost">
            Convidar
          </Button>
        </form>
      )}

      {error && <p className="mt-6 text-sm text-red-400">{error}</p>}
      {myPart && (
        <p className="mt-6 text-sm text-lime">
          Sua inscrição: {myPart.status}
        </p>
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        {canJoin && (
          <Button disabled={busy} onClick={join}>
            Participar
          </Button>
        )}
        {canSubmit && !challenge.submission_paid && (
          <Button href={`/desafios/${challenge.slug}/pagar`}>
            {`Pagar e enviar · ${((challenge.submission_fee_cents ?? 9900) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`}
          </Button>
        )}
        {canSubmit && challenge.submission_paid && (
          <Button disabled={busy} onClick={() => transition("pending_approval")}>
            Enviar para aprovação
          </Button>
        )}
        {canPublish && !challenge.submission_paid && (
          <Button href={`/desafios/${challenge.slug}/pagar`}>
            Pagar taxa para publicar
          </Button>
        )}
        {canPublish && challenge.submission_paid && (
          <Button disabled={busy} onClick={() => transition("published")}>
            Publicar
          </Button>
        )}
        {canApprove && (
          <Button disabled={busy} onClick={() => transition("published")}>
            Aprovar e publicar
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={async () => {
            const url = window.location.href;
            try {
              await navigator.clipboard.writeText(url);
              await api.trackShare(challenge.slug, "clipboard");
            } catch {
              await api.trackShare(challenge.slug, "link");
            }
          }}
        >
          Compartilhar
        </Button>
        <Button href="/desafios" variant="ghost">
          Ver todos
        </Button>
      </div>
    </div>
  );
}
