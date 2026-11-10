"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Notification } from "@/lib/api";
import { Button } from "@/components/ui/Button";

const achievements: Record<string, { name: string; text: string }> = {
  "first-steps": { name: "Primeiros passos", text: "Sua conta foi criada." },
  challenger: { name: "Desafiante", text: "Você publicou ou entrou no primeiro desafio." },
  social: { name: "Comunidade", text: "Você começou a seguir alguém." },
  recruiter: { name: "Recrutador", text: "Um amigo entrou com a sua indicação." },
  champion: { name: "Campeão", text: "Você venceu um desafio validado." },
  popular: { name: "Popular", text: "Você chegou a 5 seguidores." },
  magnet: { name: "Ímã", text: "Três pessoas se cadastraram com o seu código." },
  viral: { name: "Viral", text: "Um desafio passou de 10 visualizações." },
  host: { name: "Anfitrião", text: "Você publicou 3 desafios." },
};

function str(payload: Notification["payload"], key: string) {
  const value = payload?.[key];
  return typeof value === "string" ? value : "";
}

function describe(n: Notification): { title: string; body: string; href?: string } {
  const challenge = str(n.payload, "title");
  const named = challenge ? `“${challenge}”` : "um desafio";
  const challengeSlug =
    n.type === "challenge_joined" ||
    n.type === "challenge_invite" ||
    n.type === "invite_accepted" ||
    n.type === "invite_declined"
      ? str(n.payload, "slug")
      : "";
  const href = challengeSlug ? `/desafios/${challengeSlug}` : undefined;

  switch (n.type) {
    case "achievement_earned": {
      const ach = achievements[str(n.payload, "slug")];
      return {
        title: ach?.name ?? "Conquista",
        body: ach?.text ?? "Você desbloqueou uma conquista.",
        href: "/app/conquistas",
      };
    }
    case "new_follower":
      return { title: "Novo seguidor", body: "Alguém começou a seguir você." };
    case "referral_signup":
      return { title: "Indicação", body: "Uma pessoa criou a conta com o seu código." };
    case "challenge_joined":
      return { title: "Novo participante", body: `Alguém entrou em ${named}.`, href };
    case "challenge_invite":
      return { title: "Convite", body: `Você foi convidado para ${named}.`, href };
    case "invite_accepted":
      return { title: "Convite aceito", body: `Seu convite para ${named} foi aceito.`, href };
    case "invite_declined":
      return { title: "Convite recusado", body: `Seu convite para ${named} foi recusado.`, href };
    default:
      return { title: "Aviso", body: "Você tem uma nova notificação." };
  }
}

function when(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
        {items.map((n) => {
          const copy = describe(n);
          return (
            <li
              key={n.id}
              className={`border border-white/10 p-4 ${n.read_at ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{copy.title}</p>
                  {copy.href ? (
                    <Link href={copy.href} className="mt-1 block text-sm text-silver hover:text-lime">
                      {copy.body}
                    </Link>
                  ) : (
                    <p className="mt-1 text-sm text-silver">{copy.body}</p>
                  )}
                  <p className="mt-2 text-xs text-silver">{when(n.created_at)}</p>
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
                    Marcar como lida
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
