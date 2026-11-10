import Link from "next/link";
import type { Challenge } from "@/lib/api";
import { StatusBadge } from "./StatusBadge";

export function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const when = new Date(challenge.starts_at).toLocaleString("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <Link
      href={`/desafios/${challenge.slug}`}
      className="glass-card block overflow-hidden transition hover:border-lime/40"
    >
      {challenge.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={challenge.cover_url} alt="" className="h-40 w-full object-cover" />
      ) : null}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-silver">
            {challenge.modality_name}
          </p>
          <StatusBadge status={challenge.status} derived={challenge.derived} />
        </div>
        <h3 className="mt-3 font-display text-2xl tracking-wide text-white">{challenge.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm text-silver">{challenge.description}</p>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-silver">
          <span>{challenge.arena_name}</span>
          <span>{when}</span>
          <span>
            {challenge.confirmed_count}/{challenge.capacity} vagas
          </span>
          <span>@{challenge.creator_username}</span>
        </div>
      </div>
    </Link>
  );
}
