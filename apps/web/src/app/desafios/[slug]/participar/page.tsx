"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import QRCode from "qrcode";
import { api, type Challenge } from "@/lib/api";
import { pixCopiaECola } from "@/lib/pix";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { GlassPanel } from "@/components/ui/Glass";
import { GlassShell } from "@/components/layout/GlassShell";
import { brand } from "@/lib/brand";

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ParticiparDesafioPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<"pix" | "card">("pix");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState("");
  const [holder, setHolder] = useState("");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [raiseReais, setRaiseReais] = useState("");
  const [raiseBusy, setRaiseBusy] = useState(false);
  const [raiseMsg, setRaiseMsg] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/entrar?next=/desafios/${params.slug}/participar`);
      return;
    }
    api
      .challenge(params.slug)
      .then(setChallenge)
      .catch((e) => setError(e instanceof Error ? e.message : "erro"));
  }, [authLoading, user, params.slug, router]);

  const feeCents = challenge?.stake_cents ?? challenge?.entry_fee_cents ?? 9900;
  const pix = useMemo(
    () => (challenge ? pixCopiaECola(feeCents, `entry-${challenge.id}-${user?.id || ""}`) : ""),
    [challenge, feeCents, user?.id],
  );

  useEffect(() => {
    if (!pix) return;
    QRCode.toDataURL(pix, { margin: 1, width: 220, color: { dark: "#111111", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(""));
  }, [pix]);

  async function confirmPix() {
    if (!challenge) return;
    setBusy(true);
    setError(null);
    try {
      await api.payJoinChallenge(challenge.slug, { method: "pix" });
      router.push(`/desafios/${challenge.slug}?joined=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível confirmar o Pix.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmCard(e: FormEvent) {
    e.preventDefault();
    if (!challenge) return;
    setBusy(true);
    setError(null);
    try {
      await api.payJoinChallenge(challenge.slug, {
        method: "card",
        holder,
        number,
        expiry,
        cvv,
      });
      router.push(`/desafios/${challenge.slug}?joined=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível pagar com cartão.");
    } finally {
      setBusy(false);
    }
  }

  if (authLoading || (!challenge && !error)) {
    return <div className="px-6 py-28 text-center text-silver">Carregando pagamento…</div>;
  }

  if (error && !challenge) {
    return (
      <div className="mx-auto max-w-lg px-6 py-28 text-center">
        <p className="text-red-400">{error}</p>
        <Button href="/desafios" className="mt-6">
          Ver desafios
        </Button>
      </div>
    );
  }

  if (!challenge) return null;

  if (challenge.status !== "published" || !challenge.derived?.open) {
    return (
      <GlassShell bg={brand.images.kart}>
        <GlassPanel className="mx-auto max-w-lg !rounded-2xl p-7">
          <h1 className="font-display text-4xl text-white">Participar</h1>
          <p className="mt-3 text-silver">
            Este desafio não está aberto para novas inscrições.
          </p>
          <Button href={`/desafios/${challenge.slug}`} className="mt-6">
            Voltar ao desafio
          </Button>
        </GlassPanel>
      </GlassShell>
    );
  }

  return (
    <GlassShell bg={brand.images.kart}>
      <div className="mx-auto max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-lime">
          Entrada no desafio
        </p>
        <h1 className="mt-2 font-display text-4xl text-white md:text-5xl">
          Pagar para participar
        </h1>
        <p className="mt-3 max-w-xl text-sm text-silver md:text-base">
          Confirme o depósito do valor do desafio para garantir sua vaga no grid.
        </p>

        <GlassPanel className="mt-8 !rounded-2xl p-5 md:p-6">
          <p className="text-white">{challenge.title}</p>
          <p className="mt-1 text-sm text-silver">
            {challenge.modality_name} · {challenge.arena_name} ·{" "}
            {challenge.confirmed_count}/{challenge.capacity} vagas
          </p>
          <p className="mt-4 font-display text-4xl text-lime">{formatBRL(feeCents)}</p>
          <p className="mt-1 text-xs text-silver">Valor definido pelo criador</p>
        </GlassPanel>

        {challenge.raises_allowed && user?.id !== challenge.created_by && (
          <GlassPanel className="mt-4 !rounded-2xl p-5">
            <p className="text-sm font-semibold text-white">Subir a aposta</p>
            <p className="mt-1 text-xs text-silver">
              Propõe um valor maior. O criador aceita ou recusa antes de você pagar.
            </p>
            {challenge.pending_raise ? (
              <p className="mt-3 text-sm text-lime">
                Proposta pendente: {formatBRL(challenge.pending_raise.to_stake_cents)} (aguardando
                @{challenge.creator_username})
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={raiseReais}
                  placeholder={`acima de ${(feeCents / 100).toFixed(2)}`}
                  onChange={(e) => setRaiseReais(e.target.value.replace(/[^\d.,]/g, ""))}
                  className="min-w-[140px] flex-1 rounded-full border border-white/15 bg-black/35 px-4 py-2 text-sm text-white outline-none focus:border-lime"
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="!px-4 !py-2 text-xs"
                  disabled={raiseBusy}
                  onClick={async () => {
                    const n = Number(raiseReais.replace(",", "."));
                    if (!Number.isFinite(n) || n * 100 <= feeCents) {
                      setRaiseMsg("Informe um valor maior que a aposta atual.");
                      return;
                    }
                    setRaiseBusy(true);
                    setRaiseMsg(null);
                    try {
                      const raise = await api.proposeRaise(
                        challenge.slug,
                        Math.round(n * 100),
                      );
                      setChallenge({ ...challenge, pending_raise: raise });
                      setRaiseMsg("Proposta enviada ao criador.");
                    } catch (e) {
                      setRaiseMsg(e instanceof Error ? e.message : "erro");
                    } finally {
                      setRaiseBusy(false);
                    }
                  }}
                >
                  {raiseBusy ? "…" : "Propor"}
                </Button>
              </div>
            )}
            {raiseMsg && <p className="mt-2 text-xs text-silver">{raiseMsg}</p>}
          </GlassPanel>
        )}

        <div className="mt-6 flex gap-2">
          {(["pix", "card"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setMethod(item);
                setError(null);
              }}
              className={`rounded-full px-4 py-2 text-sm transition ${
                method === item
                  ? "bg-lime/20 font-semibold text-lime"
                  : "border border-white/15 text-silver hover:text-white"
              }`}
            >
              {item === "pix" ? "Pix" : "Cartão"}
            </button>
          ))}
        </div>

        {method === "pix" ? (
          <GlassPanel className="mt-6 !rounded-2xl p-5 md:p-6">
            <p className="text-sm text-silver">
              Escaneie o QR ou copie o código Pix. Depois confirme o pagamento.
            </p>
            {qr && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="QR Code Pix" className="mx-auto mt-5 rounded-xl bg-white p-3" />
            )}
            <div className="mt-4 break-all rounded-xl border border-white/10 bg-black/30 p-3 font-mono text-xs text-silver">
              {pix}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                variant="ghost"
                disabled={!pix}
                onClick={async () => {
                  await navigator.clipboard.writeText(pix);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? "Copiado" : "Copiar Pix"}
              </Button>
              <Button disabled={busy} onClick={() => void confirmPix()}>
                {busy ? "Confirmando…" : "Já paguei · entrar"}
              </Button>
            </div>
          </GlassPanel>
        ) : (
          <GlassPanel className="mt-6 !rounded-2xl p-5 md:p-6">
            <form onSubmit={confirmCard} className="space-y-4">
              <label className="block text-sm text-silver">
                Nome no cartão
                <input
                  required
                  value={holder}
                  onChange={(e) => setHolder(e.target.value)}
                  className="mt-1.5 w-full rounded-2xl border border-white/15 bg-black/35 px-4 py-3 text-white outline-none focus:border-lime"
                />
              </label>
              <label className="block text-sm text-silver">
                Número
                <input
                  required
                  inputMode="numeric"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="4111 1111 1111 1111"
                  className="mt-1.5 w-full rounded-2xl border border-white/15 bg-black/35 px-4 py-3 text-white outline-none focus:border-lime"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm text-silver">
                  Validade
                  <input
                    required
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    placeholder="MM/AA"
                    className="mt-1.5 w-full rounded-2xl border border-white/15 bg-black/35 px-4 py-3 text-white outline-none focus:border-lime"
                  />
                </label>
                <label className="block text-sm text-silver">
                  CVV
                  <input
                    required
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    className="mt-1.5 w-full rounded-2xl border border-white/15 bg-black/35 px-4 py-3 text-white outline-none focus:border-lime"
                  />
                </label>
              </div>
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? "Processando…" : `Pagar ${formatBRL(feeCents)} e entrar`}
              </Button>
            </form>
          </GlassPanel>
        )}

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <Button href={`/desafios/${challenge.slug}`} variant="ghost" className="mt-6">
          Voltar sem pagar
        </Button>
      </div>
    </GlassShell>
  );
}
