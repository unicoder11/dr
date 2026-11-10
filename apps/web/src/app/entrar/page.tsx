"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { GlassPanel } from "@/components/ui/Glass";
import { GlassShell } from "@/components/layout/GlassShell";
import { brand } from "@/lib/brand";

export default function EntrarPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const user = await api.login({
        email: String(fd.get("email") || ""),
        password: String(fd.get("password") || ""),
      });
      if (user.roles.includes("admin")) {
        router.push("/admin");
      } else {
        router.push("/app");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "erro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlassShell bg={brand.images.kart}>
      <GlassPanel className="mx-auto max-w-md overflow-hidden p-7 md:p-9">
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-lime">CONTA</p>
        <h1 className="mt-2 font-display text-4xl tracking-wide text-white">Entrar</h1>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block text-sm text-silver">
            Email
            <input
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-full border border-white/15 bg-black/30 px-4 py-2.5 text-white outline-none focus:border-lime"
            />
          </label>
          <label className="block text-sm text-silver">
            Senha
            <input
              name="password"
              type="password"
              required
              className="mt-1 w-full rounded-full border border-white/15 bg-black/30 px-4 py-2.5 text-white outline-none focus:border-lime"
            />
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-silver">
          Novo por aqui?{" "}
          <Link href="/cadastro" className="font-semibold text-lime hover:brightness-110">
            Criar conta
          </Link>
        </p>
      </GlassPanel>
    </GlassShell>
  );
}
