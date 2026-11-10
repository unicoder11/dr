"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { GlassPanel } from "@/components/ui/Glass";
import { brand } from "@/lib/brand";
import Image from "next/image";

const NAV: { href: string; label: string; exact?: boolean }[] = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/usuarios", label: "Usuários" },
  { href: "/admin/desafios", label: "Desafios" },
  { href: "/admin/arenas", label: "Arenas" },
  { href: "/admin/modalidades", label: "Modalidades" },
  { href: "/admin/feature-flags", label: "Flags" },
  { href: "/admin/financeiro", label: "Financeiro" },
  { href: "/admin/auditoria", label: "Auditoria" },
  { href: "/admin/relatorios", label: "Relatórios" },
];

export function AdminShell({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="relative min-h-[100svh] overflow-hidden">
      <div className="fixed inset-0 -z-10">
        <Image
          src={brand.images.challenge}
          alt=""
          fill
          priority
          className="scale-110 object-cover blur-md brightness-[0.28]"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-racing/75" />
        <div className="animate-glow-breathe absolute -left-20 top-1/4 h-80 w-80 rounded-full bg-lime/15" />
      </div>

      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-3 pb-10 pt-[5.5rem] md:flex-row md:gap-6 md:px-6 md:pb-12 md:pt-28">
        <aside className="md:w-56 md:shrink-0 lg:w-64">
          <GlassPanel className="sticky top-24 p-3 md:p-4">
            <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-lime">
              Admin DR
            </p>
            <nav className="mt-3 flex gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
              {NAV.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`whitespace-nowrap rounded-full px-3 py-2 text-sm transition ${
                      active
                        ? "bg-lime/20 font-semibold text-lime"
                        : "text-silver hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-4 hidden border-t border-white/10 pt-3 md:block">
              <Link href="/ops" className="block px-2 text-xs text-silver hover:text-lime">
                → Ops arena
              </Link>
              <Link href="/app" className="mt-1 block px-2 text-xs text-silver hover:text-lime">
                → Minha área
              </Link>
            </div>
          </GlassPanel>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-4xl text-white md:text-5xl">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-silver md:text-base">{subtitle}</p>}
            </div>
            {actions}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export function AdminStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="glass-card rounded-2xl p-4 md:p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-silver">{label}</p>
      <p className="mt-2 font-display text-4xl text-white md:text-5xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-silver">{hint}</p>}
    </div>
  );
}

export function AdminTable({ children }: { children: ReactNode }) {
  return (
    <GlassPanel className="overflow-hidden !rounded-2xl">
      <div className="overflow-x-auto">{children}</div>
    </GlassPanel>
  );
}
