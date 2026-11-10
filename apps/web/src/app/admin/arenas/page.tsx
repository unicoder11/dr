"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminGate } from "@/components/admin/AdminGate";
import { AdminShell, AdminTable } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/Button";
import { GlassPanel } from "@/components/ui/Glass";
import { api, type Arena, type Modality } from "@/lib/api";

export default function AdminArenasPage() {
  return (
    <AdminGate>
      {() => <ArenasPanel />}
    </AdminGate>
  );
}

function ArenasPanel() {
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    city: "",
    state: "",
    capacity_default: 20,
    modality_ids: [] as string[],
    publish: true,
  });

  const load = useCallback(() => {
    return Promise.all([api.arenas(true), api.adminModalities()])
      .then(([a, m]) => {
        setArenas(a);
        setModalities(m);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "erro"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function togglePublish(slug: string, published: boolean) {
    setBusy(slug);
    try {
      await api.adminPublishArena(slug, published);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro");
    } finally {
      setBusy(null);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy("create");
    try {
      await api.adminCreateArena({
        ...form,
        capacity_default: Number(form.capacity_default) || 20,
      });
      setForm({
        name: "",
        slug: "",
        description: "",
        city: "",
        state: "",
        capacity_default: 20,
        modality_ids: [],
        publish: true,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "erro");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminShell title="Arenas" subtitle="Instalações físicas · publicação e cadastro">
      {error && <p className="mb-4 text-red-400">{error}</p>}

      <AdminTable>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/5 text-silver">
            <tr>
              <th className="px-4 py-3 font-medium">Arena</th>
              <th className="px-4 py-3 font-medium">Modalidades</th>
              <th className="px-4 py-3 font-medium">Slots</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {arenas.map((a) => (
              <tr key={a.id} className="border-t border-white/10">
                <td className="px-4 py-3 text-white">
                  {a.name}
                  <div className="text-xs text-silver">/{a.slug}</div>
                </td>
                <td className="px-4 py-3 text-silver">
                  {(a.modalities || []).map((m) => m.name).join(", ") || "—"}
                </td>
                <td className="px-4 py-3 text-silver">{a.open_slots ?? 0}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-semibold uppercase ${
                      a.is_published ? "text-lime" : "text-silver"
                    }`}
                  >
                    {a.is_published ? "Publicada" : "Oculta"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Button
                    variant="ghost"
                    className="!px-3 !py-1.5 text-xs"
                    disabled={busy === a.slug}
                    onClick={() => togglePublish(a.slug, !a.is_published)}
                  >
                    {a.is_published ? "Despublicar" : "Publicar"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTable>

      <GlassPanel className="mt-6 !rounded-2xl p-5">
        <h2 className="font-display text-2xl text-white">Nova arena</h2>
        <form onSubmit={create} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            required
            placeholder="Nome"
            className="rounded-xl border border-white/15 bg-racing/60 px-4 py-2.5 text-sm text-white"
            value={form.name}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                name: e.target.value,
                slug: f.slug || e.target.value.toLowerCase().replace(/\s+/g, "-"),
              }))
            }
          />
          <input
            required
            placeholder="slug"
            className="rounded-xl border border-white/15 bg-racing/60 px-4 py-2.5 text-sm text-white"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
          />
          <input
            placeholder="Cidade"
            className="rounded-xl border border-white/15 bg-racing/60 px-4 py-2.5 text-sm text-white"
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          />
          <input
            placeholder="UF"
            className="rounded-xl border border-white/15 bg-racing/60 px-4 py-2.5 text-sm text-white"
            value={form.state}
            onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
          />
          <input
            type="number"
            min={1}
            placeholder="Capacidade"
            className="rounded-xl border border-white/15 bg-racing/60 px-4 py-2.5 text-sm text-white"
            value={form.capacity_default}
            onChange={(e) =>
              setForm((f) => ({ ...f, capacity_default: Number(e.target.value) }))
            }
          />
          <textarea
            placeholder="Descrição"
            className="rounded-xl border border-white/15 bg-racing/60 px-4 py-2.5 text-sm text-white sm:col-span-2"
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div className="sm:col-span-2">
            <p className="mb-2 text-xs uppercase tracking-wide text-silver">Modalidades</p>
            <div className="flex flex-wrap gap-2">
              {modalities.map((m) => {
                const on = form.modality_ids.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        modality_ids: on
                          ? f.modality_ids.filter((id) => id !== m.id)
                          : [...f.modality_ids, m.id],
                      }))
                    }
                    className={`rounded-full px-3 py-1 text-xs ${
                      on ? "bg-lime/20 text-lime" : "border border-white/15 text-silver"
                    }`}
                  >
                    {m.name}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-silver">
            <input
              type="checkbox"
              checked={form.publish}
              onChange={(e) => setForm((f) => ({ ...f, publish: e.target.checked }))}
            />
            Publicar imediatamente
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy === "create"}>
              Criar arena
            </Button>
          </div>
        </form>
      </GlassPanel>
    </AdminShell>
  );
}
