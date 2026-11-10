"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { useState } from "react";
import { brand } from "@/lib/brand";

const links = [
  { href: "/", label: "Home" },
  { href: "/desafios", label: "Desafios" },
  { href: "/arenas", label: "Arenas" },
  { href: "/rankings", label: "Rankings" },
  { href: "/media", label: "Media" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

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
            <Link href="/entrar" onClick={() => setOpen(false)} className="hover:text-white">
              Entrar
            </Link>
          </nav>
        </motion.div>
      )}
    </motion.header>
  );
}
