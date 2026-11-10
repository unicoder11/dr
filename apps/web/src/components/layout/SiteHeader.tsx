"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { useState } from "react";
import { brand } from "@/lib/brand";
import { useAuth, userInitials } from "@/components/auth/AuthProvider";

const links = [
  { href: "/", label: "Home" },
  { href: "/desafios", label: "Desafios" },
  { href: "/arenas", label: "Arenas" },
  { href: "/rankings", label: "Rankings" },
  { href: "/media", label: "Media" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  const firstName = user
    ? (user.display_name || user.username).trim().split(/\s+/)[0]
    : "";

  return (
    <motion.header
      initial={{ y: -28, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-40 px-3 pt-3 md:px-6 md:pt-5"
    >
      <div className="glass-pill mx-auto flex max-w-5xl items-center justify-between gap-2 px-2.5 py-2 md:gap-3 md:px-4">
        <Link href="/" className="min-w-0 shrink pl-0.5" aria-label="DESAFIOS REAIS">
          <Image
            src={brand.logo}
            alt="DESAFIOS REAIS"
            width={180}
            height={56}
            priority
            className="logo-mark h-7 w-auto max-w-[42vw] object-contain object-left md:h-9 md:max-w-none"
          />
        </Link>

        <nav className="hidden items-center gap-1 text-sm text-silver md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`nav-chip ${isActive(l.href) ? "nav-chip-active" : ""}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
          {loading ? (
            <div
              className="h-9 w-[7.5rem] animate-pulse rounded-full bg-white/10"
              aria-hidden
            />
          ) : user ? (
            <Link
              href="/app"
              className="group flex max-w-[46vw] items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1 pl-1 pr-3 transition hover:border-lime/50 hover:bg-lime/10 sm:max-w-none"
              aria-label={`Conta de ${user.display_name || user.username}`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lime font-display text-xs tracking-wide text-racing shadow-[0_0_16px_rgba(199,240,0,0.35)]">
                {userInitials(user)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-white group-hover:text-lime">
                  {firstName}
                </span>
                <span className="hidden truncate text-[10px] text-silver sm:block">
                  @{user.username}
                </span>
              </span>
            </Link>
          ) : (
            <>
              <Link
                href="/entrar"
                className="hidden rounded-full px-3 py-2 text-sm text-silver transition hover:text-white md:inline"
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className="lime-gradient-btn rounded-full px-3 py-2 text-xs font-semibold transition hover:brightness-110 sm:px-4 sm:text-sm"
              >
                Conta
              </Link>
            </>
          )}
          <button
            type="button"
            className="rounded-full border border-white/15 px-3 py-2 text-xs text-white md:hidden sm:text-sm"
            aria-expanded={open}
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
          >
            Menu
          </button>
        </div>
      </div>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card mx-auto mt-2 max-w-5xl px-5 py-5 md:hidden"
        >
          <nav className="flex flex-col gap-3 text-silver">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={isActive(l.href) ? "text-lime" : "hover:text-white"}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link
                  href="/app"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 text-white"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-lime font-display text-xs text-racing">
                    {userInitials(user)}
                  </span>
                  <span>
                    <span className="block font-semibold">{user.display_name}</span>
                    <span className="text-xs text-silver">@{user.username}</span>
                  </span>
                </Link>
                <Link
                  href="/app/desafios/novo"
                  onClick={() => setOpen(false)}
                  className="font-semibold text-lime"
                >
                  Criar desafio
                </Link>
              </>
            ) : (
              <>
                <Link href="/entrar" onClick={() => setOpen(false)} className="hover:text-white">
                  Entrar
                </Link>
                <Link href="/cadastro" onClick={() => setOpen(false)} className="text-lime">
                  Criar conta
                </Link>
              </>
            )}
          </nav>
        </motion.div>
      )}
    </motion.header>
  );
}
