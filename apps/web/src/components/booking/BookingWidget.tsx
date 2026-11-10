"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type Modality, type Slot } from "@/lib/api";
import { Button } from "@/components/ui/Button";

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function BookingWidget({ arenaSlug = "super-mountain-kart" }: { arenaSlug?: string }) {
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [modality, setModality] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.modalities().then((m) => {
      setModalities(m);
      if (m[0]) setModality(m[0].slug);
    });
  }, []);

  useEffect(() => {
    if (!modality) return;
    api
      .slots({ arena: arenaSlug, modality })
      .then(setSlots)
      .catch((e) => setError(e instanceof Error ? e.message : "erro"));
  }, [arenaSlug, modality]);

  const available = useMemo(() => slots.filter((s) => s.available), [slots]);

  async function reserve(slotId: string) {
    setBusy(true);
    setError(null);
    try {
      const booking = await api.createBooking(slotId);
      if (booking.checkout_url) {
        window.location.href = booking.checkout_url;
        return;
      }
      window.location.href = "/app/reservas";
    } catch (e) {
      const msg = e instanceof Error ? e.message : "erro";
      if (msg === "unauthorized" || msg === "http_401") {
        window.location.href = "/entrar";
        return;
      }
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-white/10 p-6">
      <h2 className="font-display text-3xl text-white">Reservar experiência</h2>
      <p className="mt-2 text-sm text-silver">
        Escolha modalidade e horário na Super Mountain Kart. Pagamento via Mercado Pago
        (mock local se não houver token).
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {modalities.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setModality(m.slug)}
            className={`rounded-sm px-3 py-1.5 text-sm ${
              modality === m.slug
                ? "bg-lime text-racing"
                : "border border-white/15 text-silver hover:border-lime"
            }`}
          >
            {m.name}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <ul className="mt-6 max-h-96 space-y-3 overflow-y-auto">
        {available.length === 0 && (
          <li className="text-sm text-silver">Nenhum horário aberto.</li>
        )}
        {available.slice(0, 12).map((slot) => {
          const when = new Date(slot.starts_at).toLocaleString("pt-BR", {
            dateStyle: "short",
            timeStyle: "short",
          });
          return (
            <li
              key={slot.id}
              className="flex flex-wrap items-center justify-between gap-3 border border-white/10 px-4 py-3"
            >
              <div>
                <p className="text-white">{when}</p>
                <p className="text-xs text-silver">
                  {slot.booked_count}/{slot.capacity} · {formatBRL(slot.price_cents)}
                </p>
              </div>
              <Button disabled={busy} onClick={() => reserve(slot.id)}>
                Reservar
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
