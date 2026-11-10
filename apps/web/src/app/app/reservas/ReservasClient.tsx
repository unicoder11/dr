"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, type Arena, type Booking } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { BookingWidget } from "@/components/booking/BookingWidget";

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function ReservasClient() {
  const params = useSearchParams();
  const status = params.get("status");
  const [items, setItems] = useState<Booking[]>([]);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [arenaSlug, setArenaSlug] = useState("super-mountain-kart");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const list = await api.myBookings();
    setItems(list);
  }

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "erro"));
    api.arenas().then((list) => {
      setArenas(list);
      if (list[0] && !list.find((a) => a.slug === arenaSlug)) {
        setArenaSlug(list[0].slug);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-6 py-28">
      <h1 className="font-display text-5xl text-white">Reservas</h1>
      <p className="mt-2 text-silver">Baterias e experiências na DR Arena.</p>

      {status === "success" && (
        <p className="mt-4 border border-lime/40 bg-lime/10 px-4 py-3 text-sm text-lime">
          Pagamento confirmado.
        </p>
      )}
      {status === "failure" && (
        <p className="mt-4 text-sm text-red-400">Pagamento não concluído.</p>
      )}
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <div className="mt-8 flex flex-wrap gap-2">
        {arenas.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setArenaSlug(a.slug)}
            className={`rounded-sm px-3 py-1.5 text-sm ${
              arenaSlug === a.slug
                ? "bg-lime text-racing"
                : "border border-white/15 text-silver hover:border-lime"
            }`}
          >
            {a.name}
          </button>
        ))}
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <BookingWidget arenaSlug={arenaSlug} />
        <div>
          <h2 className="font-display text-3xl text-white">Minhas reservas</h2>
          <ul className="mt-6 space-y-3">
            {items.length === 0 && (
              <li className="text-sm text-silver">Nenhuma reserva ainda.</li>
            )}
            {items.map((b) => {
              const when = b.starts_at
                ? new Date(b.starts_at).toLocaleString("pt-BR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "—";
              return (
                <li key={b.id} className="border border-white/10 p-4">
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="text-white">
                        {b.modality_name || "Experiência"} · {b.arena_name}
                      </p>
                      <p className="mt-1 text-sm text-silver">{when}</p>
                      <p className="mt-1 text-xs text-lime">
                        {b.status} · {formatBRL(b.amount_cents)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {b.status === "pending_payment" && b.checkout_url && (
                        <Button
                          className="!px-3 !py-2 text-xs"
                          onClick={() => {
                            window.location.href = b.checkout_url!;
                          }}
                        >
                          Pagar
                        </Button>
                      )}
                      {(b.status === "pending_payment" || b.status === "confirmed") && (
                        <Button
                          variant="ghost"
                          className="!px-3 !py-2 text-xs"
                          disabled={busy === b.id}
                          onClick={async () => {
                            setBusy(b.id);
                            try {
                              await api.cancelBooking(b.id);
                              await load();
                            } catch (e) {
                              setError(e instanceof Error ? e.message : "erro");
                            } finally {
                              setBusy(null);
                            }
                          }}
                        >
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
