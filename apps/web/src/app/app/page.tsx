"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type ApiUser } from "@/lib/api";
import { Button } from "@/components/ui/Button";

export default function AppHubPage() {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch(() => setError("Faça login para acessar o hub."));
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-6 py-32 text-center">
        <p className="text-silver">{error}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button href="/entrar">Entrar</Button>
          <Button href="/cadastro" variant="ghost">
            Criar conta
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <div className="px-6 py-32 text-center text-silver">Carregando...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-28">
      <p className="text-lime font-display tracking-widest">HUB</p>
      <h1 className="mt-2 font-display text-5xl text-white">Olá, {user.display_name}</h1>
      <p className="mt-2 text-silver">@{user.username}</p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Link className="border border-white/10 p-5 hover:border-lime" href="/desafios">
          <h2 className="font-display text-2xl text-white">Desafios</h2>
          <p className="mt-1 text-sm text-silver">Explorar marketplace</p>
        </Link>
        <Link className="border border-white/10 p-5 hover:border-lime" href="/app/desafios/novo">
          <h2 className="font-display text-2xl text-white">Criar desafio</h2>
          <p className="mt-1 text-sm text-silver">Novo confronto SMK</p>
        </Link>
        <Link className="border border-white/10 p-5 hover:border-lime" href="/app/calendario">
          <h2 className="font-display text-2xl text-white">Calendário</h2>
          <p className="mt-1 text-sm text-silver">Agenda pessoal</p>
        </Link>
        <Link className="border border-white/10 p-5 hover:border-lime" href="/app/convites">
          <h2 className="font-display text-2xl text-white">Convites</h2>
          <p className="mt-1 text-sm text-silver">Pendentes</p>
        </Link>
        <Link className="border border-white/10 p-5 hover:border-lime" href="/app/notificacoes">
          <h2 className="font-display text-2xl text-white">Notificações</h2>
          <p className="mt-1 text-sm text-silver">Alertas in-app</p>
        </Link>
        <Link className="border border-white/10 p-5 hover:border-lime" href="/arena">
          <h2 className="font-display text-2xl text-white">Reservas</h2>
          <p className="mt-1 text-sm text-silver">Super Mountain Kart</p>
        </Link>
        {user.roles.includes("admin") && (
          <Link className="border border-lime/40 p-5 hover:border-lime" href="/admin">
            <h2 className="font-display text-2xl text-white">Admin</h2>
            <p className="mt-1 text-sm text-silver">Usuários e flags</p>
          </Link>
        )}
      </div>
      <button
        className="mt-10 text-sm text-silver underline hover:text-lime"
        onClick={async () => {
          await api.logout();
          window.location.href = "/";
        }}
      >
        Sair
      </button>
    </div>
  );
}
