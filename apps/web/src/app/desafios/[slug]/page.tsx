"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
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
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [inviteUser, setInviteUser] = useState("");
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverDrag, setCoverDrag] = useState(false);
  const [coverName, setCoverName] = useState<string | null>(null);

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

  useEffect(() => {
    return () => {
      if (coverPreview?.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

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
    if (!file.type.startsWith("image/")) {
      setError("Envie uma imagem (jpg, png, webp ou gif).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Capa até 5MB.");
      return;
    }
    const localUrl = URL.createObjectURL(file);
    setCoverPreview(localUrl);
    setCoverName(file.name);
    setCoverBusy(true);
    setError(null);
    try {
      const asset = await api.uploadMedia(file, "cover", challenge.title);
      const updated = await api.setChallengeCover(challenge.slug, asset.id);
      setChallenge(updated);
      setCoverPreview(updated.cover_url || localUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro");
      setCoverPreview(challenge.cover_url || null);
    } finally {
      setCoverBusy(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
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
          <dt className="text-silver">Valor do desafio</dt>
          <dd className="mt-1 text-white">
            {((challenge.stake_cents ?? challenge.entry_fee_cents ?? 9900) / 100).toLocaleString(
              "pt-BR",
              { style: "currency", currency: "BRL" },
            )}
            {challenge.raises_allowed ? " · sobe aposta" : ""}
          </dd>
        </div>
        <div>
          <dt className="text-silver">Pozo</dt>
          <dd className="mt-1 text-white">
            {((challenge.pot_cents ?? 0) / 100).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
            {challenge.platform_fee_bps
              ? ` · taxa DR ${(challenge.platform_fee_bps / 100).toFixed(0)}%`
              : ""}
            {challenge.settled && challenge.winner_username
              ? ` · ganhador @${challenge.winner_username}`
              : ""}
          </dd>
        </div>
        <div>
          <dt className="text-silver">Regulamento</dt>
          <dd className="mt-1 text-white">{challenge.regulation || "—"}</dd>
        </div>
      </dl>

      {isOwner && challenge.pending_raise && (
        <section className="mt-8 rounded-2xl border border-lime/30 bg-lime/5 p-5">
          <h2 className="font-display text-2xl text-white">Proposta de aposta</h2>
          <p className="mt-2 text-sm text-silver">
            @{challenge.pending_raise.proposer_username || "retador"} quer subir de{" "}
            {(challenge.pending_raise.from_stake_cents / 100).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}{" "}
            para{" "}
            <span className="text-lime">
              {(challenge.pending_raise.to_stake_cents / 100).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await api.acceptRaise(challenge.slug, challenge.pending_raise!.id);
                  await load();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "erro");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Aceitar
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await api.refuseRaise(challenge.slug, challenge.pending_raise!.id);
                  await load();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "erro");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Recusar
            </Button>
          </div>
        </section>
      )}

      {isOwner && (challenge.creator_topup_due_cents ?? 0) > 0 && (
        <section className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-5">
          <p className="text-sm text-amber-100">
            Falta complementar a aposta:{" "}
            {((challenge.creator_topup_due_cents ?? 0) / 100).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </p>
          <Button href={`/desafios/${challenge.slug}/pagar`} className="mt-3">
            Pagar diferença
          </Button>
        </section>
      )}

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
        <section className="mt-10 border-t border-white/10 pt-8">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-lime">
                Visual
              </p>
              <h2 className="mt-1 font-display text-2xl text-white">Capa do desafio</h2>
              <p className="mt-1 text-sm text-silver">
                Imagem larga (21:9). JPG, PNG ou WebP · até 5MB.
              </p>
            </div>
            {coverBusy && (
              <span className="rounded-full border border-lime/30 bg-lime/10 px-3 py-1 text-xs font-semibold text-lime">
                Enviando…
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={coverBusy}
            onClick={() => coverInputRef.current?.click()}
            onDragEnter={(e) => {
              e.preventDefault();
              setCoverDrag(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setCoverDrag(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setCoverDrag(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setCoverDrag(false);
              void onCoverChange(e.dataTransfer.files?.[0] || null);
            }}
            className={`group relative mt-5 w-full overflow-hidden rounded-2xl border text-left transition ${
              coverDrag
                ? "border-lime bg-lime/10"
                : "border-white/15 bg-white/[0.03] hover:border-lime/45 hover:bg-white/[0.05]"
            } ${coverBusy ? "pointer-events-none opacity-70" : ""}`}
          >
            {(coverPreview || challenge.cover_url) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverPreview || challenge.cover_url || ""}
                alt="Capa atual"
                className="aspect-[21/9] w-full object-cover transition duration-500 group-hover:scale-[1.02]"
              />
            ) : (
              <div className="flex aspect-[21/9] w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-white/[0.04] to-transparent px-6">
                <span className="font-display text-3xl text-white/80">+</span>
                <span className="text-sm text-silver">Solta a imagem aqui ou toca para escolher</span>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-racing/90 via-racing/40 to-transparent px-4 pb-4 pt-10">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {challenge.cover_url || coverPreview
                      ? "Trocar capa"
                      : "Adicionar capa"}
                  </p>
                  <p className="text-xs text-silver">
                    {coverName
                      ? coverName
                      : coverDrag
                        ? "Solta para enviar"
                        : "Arrasta ou escolhe do álbum"}
                  </p>
                </div>
                <span className="rounded-full border border-lime/40 bg-lime/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-lime">
                  {coverBusy ? "…" : "Upload"}
                </span>
              </div>
            </div>
          </button>

          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={coverBusy}
            className="sr-only"
            onChange={(e) => void onCoverChange(e.target.files?.[0] || null)}
          />
        </section>
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
          <Button href={`/desafios/${challenge.slug}/participar`}>
            {`Retar · ${((challenge.stake_cents ?? challenge.entry_fee_cents ?? 9900) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`}
          </Button>
        )}
        {canSubmit && !challenge.submission_paid && (
          <Button href={`/desafios/${challenge.slug}/pagar`}>
            {`Pagar e enviar · ${((challenge.stake_cents ?? challenge.submission_fee_cents ?? 9900) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`}
          </Button>
        )}
        {canSubmit && challenge.submission_paid && (
          <Button disabled={busy} onClick={() => transition("pending_approval")}>
            Enviar para aprovação
          </Button>
        )}
        {canPublish && !challenge.submission_paid && (
          <Button href={`/desafios/${challenge.slug}/pagar`}>
            Pagar valor para publicar
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
