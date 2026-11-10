"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";

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
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-28">
      <h1 className="font-display text-4xl text-white">Entrar</h1>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block text-sm text-silver">
          Email
          <input
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-sm border border-white/15 bg-graphite px-3 py-2 text-white outline-none focus:border-lime"
          />
        </label>
        <label className="block text-sm text-silver">
          Senha
          <input
            name="password"
            type="password"
            required
            className="mt-1 w-full rounded-sm border border-white/15 bg-graphite px-3 py-2 text-white outline-none focus:border-lime"
          />
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </div>
  );
}
