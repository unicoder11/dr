"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import QRCode from "qrcode";
import { api, type Booking } from "@/lib/api";
import { pixCopiaECola } from "@/lib/pix";
import { Button } from "@/components/ui/Button";

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PagarReservaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [missing, setMissing] = useState(false);
  const [method, setMethod] = useState<"pix" | "card">("pix");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState("");
  const [holder, setHolder] = useState("");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  useEffect(() => {
    api
      .myBookings()
      .then((list) => {
        const found = list.find((b) => b.id === params.id) || null;
        setBooking(found);
        setMissing(!found);
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : "erro";
        if (msg === "unauthorized" || msg === "http_401") {
          router.replace("/entrar");
          return;
        }
        setError(msg);
      });
  }, [params.id, router]);

  const pix = useMemo(
    () => (booking ? pixCopiaECola(booking.amount_cents, booking.id) : ""),
    [booking],
  );

  useEffect(() => {
    if (!pix) return;
    QRCode.toDataURL(pix, { margin: 1, width: 220, color: { dark: "#111111", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(""));
  }, [pix]);

  async function confirmPix() {
    if (!booking) return;
    setBusy(true);
    setError(null);
    try {
      await api.payBooking(booking.id, { method: "pix" });
      router.push("/app/reservas?status=success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível confirmar o Pix.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmCard(e: FormEvent) {
    e.preventDefault();
    if (!booking) return;
    setBusy(true);
    setError(null);
    try {
      await api.payBooking(booking.id, {
        method: "card",
        holder,
        number,
        expiry,
        cvv,
      });
      router.push("/app/reservas?status=success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível pagar com cartão.");
    } finally {
      setBusy(false);
    }
  }

  if (!booking && !missing && !error) {
    return <div className="px-6 py-28 text-silver">Carregando pagamento...</div>;
  }

  if (missing) {
    return (
      <div className="mx-auto max-w-lg px-6 py-28">
        <h1 className="font-display text-4xl text-white">Pagamento</h1>
        <p className="mt-4 text-silver">Não encontramos essa reserva.</p>
      </div>
    );
  }

  if (booking && booking.status !== "pending_payment") {
    return (
      <div className="mx-auto max-w-lg px-6 py-28">
        <h1 className="font-display text-4xl text-white">Pagamento</h1>
        <p className="mt-4 text-silver">
          {booking.status === "confirmed"
            ? "Esta reserva já está confirmada."
            : "Esta reserva não está aguardando pagamento."}
        </p>
        <Button href="/app/reservas" className="mt-6">
          Ver reservas
        </Button>
      </div>
    );
  }

  const when = booking?.starts_at
    ? new Date(booking.starts_at).toLocaleString("pt-BR", { dateStyle: "full", timeStyle: "short" })
    : "";

  return (
    <div className="mx-auto max-w-3xl px-6 py-28">
      <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-lime">Pagamento</p>
      <h1 className="mt-2 font-display text-5xl text-white">Pagar reserva</h1>
      <p className="mt-3 text-sm text-silver">
        A vaga só fica confirmada depois do pagamento. Escolha Pix ou cartão.
      </p>

      {booking && (
        <div className="mt-8 border border-white/10 p-5">
          <p className="text-white">
            {booking.modality_name || "Experiência"} · {booking.arena_name}
          </p>
          <p className="mt-1 text-sm text-silver">{when}</p>
          <p className="mt-3 font-display text-3xl text-lime">{formatBRL(booking.amount_cents)}</p>
        </div>
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
            className={`rounded-sm px-4 py-2 text-sm ${
              method === item ? "bg-lime text-racing" : "border border-white/15 text-silver"
            }`}
          >
            {item === "pix" ? "Pix" : "Cartão"}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {method === "pix" && (
        <div className="mt-6 border border-white/10 p-5">
          <p className="text-sm text-silver">
            Escaneie o QR no app do banco ou copie o código Pix.
          </p>
          {qr && (
            <img src={qr} alt="QR Code Pix" className="mt-4 h-52 w-52 bg-white p-2" />
          )}
          <p className="mt-4 break-all text-xs text-silver">{pix}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={async () => {
                await navigator.clipboard.writeText(pix);
                setCopied(true);
              }}
            >
              {copied ? "Código copiado" : "Copiar código"}
            </Button>
            <Button type="button" disabled={busy} onClick={confirmPix}>
              {busy ? "Confirmando..." : "Já paguei com Pix"}
            </Button>
          </div>
        </div>
      )}

      {method === "card" && (
        <form onSubmit={confirmCard} className="mt-6 space-y-4 border border-white/10 p-5">
          <label className="block text-sm text-silver">
            Número do cartão
            <input
              inputMode="numeric"
              autoComplete="cc-number"
              required
              value={number}
              onChange={(e) => setNumber(e.target.value.replace(/[^\d ]/g, "").slice(0, 23))}
              placeholder="0000 0000 0000 0000"
              className="mt-1 w-full rounded-sm border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-lime"
            />
          </label>
          <label className="block text-sm text-silver">
            Nome impresso
            <input
              autoComplete="cc-name"
              required
              value={holder}
              onChange={(e) => setHolder(e.target.value)}
              className="mt-1 w-full rounded-sm border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-lime"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm text-silver">
              Validade
              <input
                inputMode="numeric"
                autoComplete="cc-exp"
                required
                placeholder="MM/AA"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value.replace(/[^\d/]/g, "").slice(0, 5))}
                className="mt-1 w-full rounded-sm border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-lime"
              />
            </label>
            <label className="block text-sm text-silver">
              CVV
              <input
                inputMode="numeric"
                autoComplete="cc-csc"
                required
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="mt-1 w-full rounded-sm border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-lime"
              />
            </label>
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Pagando..." : `Pagar ${booking ? formatBRL(booking.amount_cents) : ""}`}
          </Button>
        </form>
      )}
    </div>
  );
}
