"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminGate } from "@/components/admin/AdminGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { GlassPanel } from "@/components/ui/Glass";
import { api, type AdminFlag } from "@/lib/api";

export default function AdminFlagsPage() {
  return (
    <AdminGate>
      {() => <FlagsPanel />}
    </AdminGate>
  );
}

function FlagsPanel() {
  const [flags, setFlags] = useState<AdminFlag[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    return api
      .adminFlags()
      .then(setFlags)
      .catch((e) => setError(e instanceof Error ? e.message : "erro"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(key: string, enabled: boolean) {
    setBusy(key);
    try {
      const updated = await api.adminSetFlag(key, enabled);
      setFlags((prev) => prev.map((f) => (f.key === key ? updated : f)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminShell
      title="Feature flags"
      subtitle="Kill switches e liberação gradual de superfície"
    >
      {error && <p className="mb-4 text-red-400">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {flags.length === 0 && !error && (
          <p className="text-silver">Nenhuma flag cadastrada.</p>
        )}
        {flags.map((f) => (
          <GlassPanel key={f.key} className="!rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-sm text-lime">{f.key}</p>
                <p className="mt-1 text-xs text-silver">
                  {f.enabled ? "Ligada" : "Desligada"}
                  {f.metadata && Object.keys(f.metadata).length > 0
                    ? ` · ${JSON.stringify(f.metadata)}`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                disabled={busy === f.key}
                onClick={() => toggle(f.key, !f.enabled)}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                  f.enabled ? "bg-lime" : "bg-white/20"
                }`}
                aria-label={`Toggle ${f.key}`}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-racing shadow transition ${
                    f.enabled ? "left-5" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          </GlassPanel>
        ))}
      </div>
    </AdminShell>
  );
}
