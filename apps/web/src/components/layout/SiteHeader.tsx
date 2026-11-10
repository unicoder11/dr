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
      className="fixed inset-x-0 top-0 z-40 px-4 pt-4 md:px-6 md:pt-5"
    >
      <div className="glass-pill mx-auto flex max-w-5xl items-center justify-between gap-3 px-3 py-2 md:px-4">
        <Link href="/" className="shrink-0 pl-1" aria-label="DESAFIOS REAIS">
          <Image
            src={brand.logo}
            alt="DESAFIOS REAIS"
            width={180}
            height={56}
            priority
            className="logo-mark h-8 w-auto md:h-9"
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

        <div className="flex items-center gap-2">
          <Link
            href="/entrar"
            className="hidden rounded-full px-3 py-2 text-sm text-silver transition hover:text-white sm:inline"
          >
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="lime-gradient-btn rounded-full px-4 py-2 text-sm font-semibold transition hover:brightness-110"
          >
            Conta
          </Link>
          <button
            type="button"
            className="rounded-full border border-white/15 px-3 py-2 text-sm text-white md:hidden"
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
