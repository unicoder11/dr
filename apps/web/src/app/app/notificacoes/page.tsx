"use client";

import { useEffect, useState } from "react";
import { api, type Notification } from "@/lib/api";
import { Button } from "@/components/ui/Button";

export default function NotificacoesPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const list = await api.notifications();
    setItems(list);
  }

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "erro"));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-6 py-28">
      <h1 className="font-display text-5xl text-white">Notificações</h1>
      {error && <p className="mt-6 text-red-400">{error}</p>}
      <ul className="mt-10 space-y-3">
        {items.length === 0 && !error && (
          <li className="text-silver">Sem notificações.</li>
        )}
        {items.map((n) => (
          <li
            key={n.id}
            className={`border border-white/10 p-4 ${n.read_at ? "opacity-60" : ""}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-lime">{n.type}</p>
                <p className="mt-1 text-sm text-silver">
                  {typeof n.payload?.title === "string"
                    ? n.payload.title
                    : JSON.stringify(n.payload)}
                </p>
                <p className="mt-2 text-xs text-silver">
                  {new Date(n.created_at).toLocaleString("pt-BR")}
                </p>
              </div>
              {!n.read_at && (
                <Button
                  variant="ghost"
                  className="!px-3 !py-1 text-xs"
                  onClick={async () => {
                    await api.markNotificationRead(n.id);
                    await load();
                  }}
                >
                  Ler
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
