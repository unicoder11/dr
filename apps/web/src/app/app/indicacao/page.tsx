"use client";

import { useEffect, useState } from "react";
import { api, type ReferralStats } from "@/lib/api";
import { Button } from "@/components/ui/Button";

export default function IndicacaoPage() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api
      .myReferral()
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : "erro"));
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-6 py-28 text-center">
        <p className="text-red-400">{error}</p>
        <Button href="/entrar" className="mt-6">
          Entrar
        </Button>
      </div>
    );
  }

  if (!stats) {
    return <div className="px-6 py-28 text-center text-silver">Carregando...</div>;
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-28">
      <h1 className="font-display text-5xl text-white">Indicação</h1>
      <p className="mt-2 text-silver">
        Compartilhe seu link. Cada cadastro conta para a conquista Recrutador.
      </p>
      <div className="mt-8 border border-white/10 p-5">
        <p className="text-xs uppercase tracking-wide text-lime">Código</p>
        <p className="mt-2 font-display text-3xl text-white">{stats.code}</p>
        <p className="mt-4 break-all text-sm text-silver">{stats.share_url}</p>
        <p className="mt-4 text-sm text-white">
          Cadastros atribuídos: <span className="text-lime">{stats.signups}</span>
        </p>
        <Button
          className="mt-6"
          onClick={async () => {
            await navigator.clipboard.writeText(stats.share_url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Copiado" : "Copiar link"}
        </Button>
      </div>
    </div>
  );
}
