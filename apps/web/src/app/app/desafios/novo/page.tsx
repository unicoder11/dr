"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type Arena, type Modality } from "@/lib/api";
import { Button } from "@/components/ui/Button";

export default function NovoDesafioPage() {
  const router = useRouter();
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  useEffect(() => {
    api.me().catch(() => router.push("/entrar"));
    Promise.all([api.modalities(), api.arenas()])
      .then(([m, a]) => {
        setModalities(m);
        setArenas(a);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "erro"));
  }, [router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const startsLocal = String(fd.get("starts_at") || "");
    const starts_at = new Date(startsLocal).toISOString();
    try {
      let ch = await api.createChallenge({
        title: String(fd.get("title") || ""),
        description: String(fd.get("description") || ""),
        modality_id: String(fd.get("modality_id") || ""),
        arena_id: String(fd.get("arena_id") || ""),
        competition_type: String(fd.get("competition_type") || "open"),
        regulation: String(fd.get("regulation") || ""),
        capacity: Number(fd.get("capacity") || 8),
        starts_at,
      });
      if (coverFile) {
        const asset = await api.uploadMedia(coverFile, "cover", ch.title);
        ch = await api.setChallengeCover(ch.slug, asset.id);
      }
      router.push(`/desafios/${ch.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "erro");
    } finally {
      setLoading(false);
    }
  }

  const defaultStart = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);

  return (
    <div className="mx-auto max-w-xl px-6 py-28">
      <h1 className="font-display text-4xl text-white">Criar desafio</h1>
      <p className="mt-2 text-sm text-silver">
        Salva como rascunho. Depois envie para aprovação ou publique (se tiver role creator).
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <Field label="Título" name="title" required />
        <label className="block text-sm text-silver">
          Descrição
          <textarea
            name="description"
            rows={4}
            className="mt-1 w-full rounded-sm border border-white/15 bg-graphite px-3 py-2 text-white outline-none focus:border-lime"
          />
        </label>
        <label className="block text-sm text-silver">
          Modalidade
          <select
            name="modality_id"
            required
            className="mt-1 w-full rounded-sm border border-white/15 bg-graphite px-3 py-2 text-white outline-none focus:border-lime"
          >
            <option value="">Selecione</option>
            {modalities.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-silver">
          Arena
          <select
            name="arena_id"
            required
            className="mt-1 w-full rounded-sm border border-white/15 bg-graphite px-3 py-2 text-white outline-none focus:border-lime"
          >
            <option value="">Selecione</option>
            {arenas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-silver">
          Tipo
          <select
            name="competition_type"
            defaultValue="open"
            className="mt-1 w-full rounded-sm border border-white/15 bg-graphite px-3 py-2 text-white outline-none focus:border-lime"
          >
            <option value="open">Aberto</option>
            <option value="one_vs_one">1x1</option>
            <option value="individual">Individual</option>
            <option value="team">Equipes</option>
            <option value="tournament">Torneio</option>
          </select>
        </label>
        <Field label="Capacidade" name="capacity" type="number" defaultValue="8" required />
        <Field label="Data e horário" name="starts_at" type="datetime-local" defaultValue={defaultStart} required />
        <label className="block text-sm text-silver">
          Capa (jpg/png/webp, máx. 5MB)
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
            className="mt-1 block w-full text-sm text-silver file:mr-3 file:rounded-sm file:border-0 file:bg-lime file:px-3 file:py-1.5 file:font-semibold file:text-racing"
          />
        </label>
        <label className="block text-sm text-silver">
          Regulamento
          <textarea
            name="regulation"
            rows={3}
            className="mt-1 w-full rounded-sm border border-white/15 bg-graphite px-3 py-2 text-white outline-none focus:border-lime"
          />
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Salvando..." : "Salvar rascunho"}
        </Button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block text-sm text-silver">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-sm border border-white/15 bg-graphite px-3 py-2 text-white outline-none focus:border-lime"
      />
    </label>
  );
}
