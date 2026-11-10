"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { GlassCard, GlassPanel } from "@/components/ui/Glass";
import { ScrollProgress } from "@/components/motion/ScrollProgress";
import { brand } from "@/lib/brand";

const ease = [0.22, 1, 0.36, 1] as const;

export function HomeClient() {
  return (
    <div className="relative min-h-[100svh] overflow-hidden">
      <ScrollProgress />

      <div className="fixed inset-0 -z-10">
        <Image
          src={brand.images.kart}
          alt=""
          fill
          priority
          className="scale-110 object-cover blur-md brightness-[0.28]"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-racing/70" />
        <div className="animate-glow-breathe absolute -left-20 top-1/4 hidden h-80 w-80 rounded-full bg-lime/20 md:block" />
        <div className="animate-ember-drift absolute bottom-10 right-0 hidden h-72 w-72 rounded-full bg-gold/15 md:block" />
      </div>

      <div className="mx-auto max-w-[1280px] px-3 pb-6 pt-[5.5rem] md:px-6 md:pb-10 md:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, ease }}
        >
          <GlassPanel className="relative overflow-hidden">
            {/* Cinematic full-bleed plate — no framed photo */}
            <div className="relative min-h-[68vh] md:min-h-[72vh]">
              <Image
                src={brand.images.kart}
                alt="Super Mountain Kart em ação"
                fill
                priority
                className="object-cover object-[68%_center]"
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-racing via-racing/80 to-racing/15" />
              <div className="absolute inset-0 bg-gradient-to-t from-racing via-transparent to-racing/30" />
              <motion.span
                aria-hidden
                className="outline-number pointer-events-none absolute -right-2 bottom-24 z-[1] hidden text-[14rem] opacity-60 sm:block md:right-6 md:text-[16rem] lg:text-[18rem]"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 0.6, scale: 1 }}
                transition={{ delay: 0.35, duration: 1, ease }}
              >
                01
              </motion.span>

              <div className="relative z-10 flex h-full min-h-[68vh] flex-col justify-end p-5 pb-7 md:min-h-[72vh] md:p-10 md:pb-12 lg:p-12">
                <div className="max-w-xl">
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12, duration: 0.7, ease }}
                  >
                    <Image
                      src={brand.logo}
                      alt="DESAFIOS REAIS"
                      width={380}
                      height={120}
                      priority
                      className="logo-mark h-11 w-auto sm:h-12 md:h-16 lg:h-[4.5rem]"
                    />
                  </motion.div>

                  <motion.p
                    className="mt-5 text-[10px] font-semibold uppercase tracking-[0.35em] text-lime sm:mt-6 sm:text-[11px] sm:tracking-[0.42em]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.28 }}
                  >
                    DR CHALLENGES
                  </motion.p>

                  <motion.h1
                    className="mt-3 font-display text-[2.65rem] uppercase leading-[0.92] tracking-wide text-white sm:text-5xl md:text-7xl lg:text-8xl"
                    initial={{ opacity: 0, y: 28 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.32, duration: 0.85, ease }}
                  >
                    O SEU DESAFIO.
                    <br />
                    A SUA HISTÓRIA.
                  </motion.h1>

                  <motion.p
                    className="mt-5 max-w-md text-sm font-medium leading-relaxed text-silver md:text-base"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.48, duration: 0.7, ease }}
                  >
                    Ecossistema de entretenimento competitivo — do convite digital à pista presencial.
                  </motion.p>

                  <motion.div
                    className="mt-8 flex flex-wrap gap-3"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.62, duration: 0.7, ease }}
                  >
                    <Button href="/desafios">
                      Explorar desafios
                      <span aria-hidden>→</span>
                    </Button>
                    <Button href="/cadastro" variant="ghost">
                      Criar meu desafio
                    </Button>
                  </motion.div>
                </div>

                <motion.p
                  className="mt-10 hidden text-[10px] font-semibold uppercase tracking-[0.35em] text-lime/90 md:block"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  DR KART · Super Mountain Kart
                </motion.p>
              </div>
            </div>

            <div className="relative z-10 grid gap-3 border-t border-white/10 bg-black/25 p-3 backdrop-blur-md sm:p-4 md:grid-cols-3 md:gap-4 md:p-5">
              <DashCard
                href="/desafios"
                eyebrow="PRÓXIMO"
                title="Desafios abertos"
                meta="Marketplace multi-arena"
                image={brand.images.gravity}
                delay={0.75}
              >
                <p className="mt-3 font-display text-3xl tracking-wide text-lime md:text-4xl">AGORA</p>
                <p className="mt-1 text-xs text-silver">Kart · Gravity · SMK</p>
              </DashCard>

              <DashCard
                href="/rankings"
                eyebrow="STANDINGS"
                title="Ranking da temporada"
                meta="Resultados oficiais"
                delay={0.85}
              >
                <ul className="mt-3 space-y-2 text-sm">
                  {[
                    ["01", "Pilotos confirmados", "pts"],
                    ["02", "Creators em alta", "xp"],
                    ["03", "Arenas ativas", "slots"],
                  ].map(([n, label, unit]) => (
                    <li key={n} className="flex items-center justify-between gap-2 text-silver">
                      <span>
                        <span className="mr-2 font-display text-lime">{n}</span>
                        {label}
                      </span>
                      <span className="text-xs uppercase tracking-wider text-white/50">{unit}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs font-semibold text-lime">Ver ranking completo →</p>
              </DashCard>

              <DashCard
                href="/media"
                eyebrow="DR MEDIA"
                title="Highlights & Live"
                meta="Conteúdo da arena"
                image={brand.images.winners}
                delay={0.95}
              >
                <div className="mt-3 space-y-2">
                  {["SMK Live — bateria da noite", "Urban Circuit highlights", "DR Confronto #01"].map(
                    (t) => (
                      <div key={t} className="flex items-center gap-2 text-sm text-silver">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-lime/15 text-[10px] text-lime">
                          ▶
                        </span>
                        <span className="line-clamp-1">{t}</span>
                      </div>
                    ),
                  )}
                </div>
              </DashCard>
            </div>

            <motion.div
              className="relative z-10 flex flex-col gap-3 border-t border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.05, duration: 0.7, ease }}
            >
              <div className="flex items-center gap-3 text-sm text-silver">
                <CheckeredMark />
                <span className="leading-snug">
                  A emoção é real — Desafie. Compita. Vença.
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/arenas"
                  className="rounded-full px-3 py-1.5 text-sm text-silver transition hover:text-white"
                >
                  Arenas
                </Link>
                <Link
                  href="/como-funciona"
                  className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-white transition hover:bg-lime hover:text-racing"
                >
                  Como funciona
                </Link>
              </div>
            </motion.div>
          </GlassPanel>
        </motion.div>
      </div>
    </div>
  );
}

function CheckeredMark() {
  return (
    <span
      aria-hidden
      className="grid shrink-0 grid-cols-2 gap-px overflow-hidden rounded-[2px]"
      style={{ width: 12, height: 18 }}
    >
      <span className="bg-white" />
      <span className="bg-racing" />
      <span className="bg-racing" />
      <span className="bg-white" />
      <span className="bg-white" />
      <span className="bg-racing" />
    </span>
  );
}

function DashCard({
  href,
  eyebrow,
  title,
  meta,
  image,
  children,
  delay,
}: {
  href: string;
  eyebrow: string;
  title: string;
  meta: string;
  image?: string;
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.7, ease }}
    >
      <Link href={href} className="block h-full">
        <GlassCard className="relative h-full overflow-hidden p-4 md:p-5">
          {image ? (
            <div className="pointer-events-none absolute inset-0 opacity-30">
              <Image src={image} alt="" fill className="object-cover" sizes="33vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-racing via-racing/85 to-racing/45" />
            </div>
          ) : null}
          <div className="relative">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-lime">{eyebrow}</p>
            <h2 className="mt-1 font-display text-2xl tracking-wide text-white">{title}</h2>
            <p className="text-xs text-silver">{meta}</p>
            {children}
          </div>
        </GlassCard>
      </Link>
    </motion.div>
  );
}
