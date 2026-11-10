"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";

export default function CadastroPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await api.register({
        email: String(fd.get("email") || ""),
        password: String(fd.get("password") || ""),
        username: String(fd.get("username") || ""),
        display_name: String(fd.get("display_name") || ""),
      });
      await api.login({
        email: String(fd.get("email") || ""),
        password: String(fd.get("password") || ""),
      });
      router.push("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "erro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-28">
      <h1 className="font-display text-4xl text-white">Criar conta</h1>
      <p className="mt-2 text-sm text-silver">Entre no ecossistema DESAFIOS REAIS.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <Field name="display_name" label="Nome" />
        <Field name="username" label="Username" required />
        <Field name="email" label="Email" type="email" required />
        <Field name="password" label="Senha" type="password" required />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Criando..." : "Cadastrar"}
        </Button>
      </form>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm text-silver">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        className="mt-1 w-full rounded-sm border border-white/15 bg-graphite px-3 py-2 text-white outline-none focus:border-lime"
      />
    </label>
  );
}
