"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, type ApiUser, type PublicProfile } from "@/lib/api";
import { Button } from "@/components/ui/Button";

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [me, setMe] = useState<ApiUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const p = await api.profile(params.username);
    setProfile(p);
  }

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "erro"));
    api.me().then(setMe).catch(() => setMe(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.username]);

  if (error && !profile) {
    return (
      <div className="mx-auto max-w-lg px-6 py-28 text-center">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }
  if (!profile) {
    return <div className="px-6 py-28 text-center text-silver">Carregando...</div>;
  }

  const isSelf = me?.username === profile.username;

  async function toggleFollow() {
    if (!me) {
      window.location.href = "/entrar";
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (profile!.is_following) {
        await api.unfollow(profile!.username);
      } else {
        await api.follow(profile!.username);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-28">
      <p className="text-xs uppercase tracking-widest text-lime">Perfil</p>
      <h1 className="mt-2 font-display text-5xl text-white">{profile.display_name}</h1>
      <p className="mt-1 text-silver">@{profile.username}</p>
      {(profile.bio || profile.city) && (
        <p className="mt-4 text-silver">
          {profile.bio}
          {profile.city ? ` · ${profile.city}` : ""}
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-6 text-sm text-silver">
        <span>
          <strong className="text-white">{profile.followers_count}</strong> seguidores
        </span>
        <span>
          <strong className="text-white">{profile.following_count}</strong> seguindo
        </span>
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <div className="mt-8 flex flex-wrap gap-3">
        {!isSelf && (
          <Button disabled={busy} onClick={toggleFollow}>
            {profile.is_following ? "Deixar de seguir" : "Seguir"}
          </Button>
        )}
        {isSelf && (
          <>
            <Button href="/app/indicacao" variant="ghost">
              Meu link de indicação
            </Button>
            <Button href="/app/conquistas" variant="ghost">
              Conquistas
            </Button>
          </>
        )}
      </div>

      <section className="mt-12 border-t border-white/10 pt-8">
        <h2 className="font-display text-3xl text-white">Conquistas</h2>
        <ul className="mt-4 space-y-3">
          {profile.achievements.length === 0 && (
            <li className="text-sm text-silver">Nenhuma conquista ainda.</li>
          )}
          {profile.achievements.map((a) => (
            <li key={a.slug} className="border border-white/10 px-4 py-3">
              <p className="text-lime text-xs uppercase tracking-wide">{a.icon}</p>
              <p className="text-white">{a.name}</p>
              <p className="text-sm text-silver">{a.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-8 text-sm">
        <Link href="/rankings" className="text-silver hover:text-lime">
          Ver rankings →
        </Link>
      </p>
    </div>
  );
}
