import Image from "next/image";
import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { GlassPanel } from "@/components/ui/Glass";
import { GlassShell } from "@/components/layout/GlassShell";
import { basq } from "@/lib/basq";
import { formatBRL } from "@/lib/bsak";

export const metadata: Metadata = {
  title: "BASQ — Brasileiro Amador de Sinuquinha",
  description:
    "BASQ 300K garantido: classificatórias estaduais, finais no Rio e R$ 300 mil em premiação.",
};

const totalSlots = basq.classificatorias.reduce((acc, row) => acc + row.slots, 0);

export default function BasqTournamentPage() {
  return (
    <GlassShell bg={basq.banner}>
      <section className="relative overflow-hidden rounded-2xl border border-white/10">
        <div className="relative aspect-[3/1] min-h-[220px] w-full md:min-h-[280px]">
          <Image
            src={basq.banner}
            alt="BASQ — Brasileiro Amador de Sinuquinha"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-racing/80 via-racing/35 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-racing/70 via-transparent to-racing/20" />
        </div>
        <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-8 lg:p-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-lime">
            Torneio oficial · DR × BASQ
          </p>
          <h1 className="mt-2 max-w-3xl font-display text-4xl uppercase leading-[0.95] tracking-wide text-white md:text-6xl lg:text-7xl">
            {basq.name}
            <span className="block text-lime">{basq.guaranteed}</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm text-silver md:text-base">
            {basq.fullNamePt}. Inscrição {formatBRL(basq.entryFeeReais)} · finais com{" "}
            {basq.finals.slots} atletas no {basq.finals.stage}.
          </p>
        </div>
      </section>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Em premiação" value="R$ 300 mil" hint="garantida" />
        <Stat label="Inscrição" value={formatBRL(basq.entryFeeReais)} hint="por atleta" />
        <Stat
          label="Classificatórias"
          value={String(basq.classificatorias.length)}
          hint="etapas estaduais"
        />
        <Stat
          label="Vagas nas finais"
          value={String(basq.finals.slots)}
          hint={`${basq.finals.dates} · ${basq.finals.stage}`}
        />
      </div>

      <GlassPanel className="mt-6 !rounded-2xl p-5 md:p-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-lime">
          Como funciona
        </p>
        <h2 className="mt-2 font-display text-3xl text-white md:text-4xl">Do estado à final</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-silver md:text-base">
          Dispute as classificatórias pelo Brasil, garanta uma das {totalSlots} vagas para a grande
          final e concorra a {basq.tagline.toLowerCase()}.
        </p>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            {
              n: "01",
              title: "Classifique no seu estado",
              body: "Cada etapa classifica um número definido de atletas conforme a grade local.",
            },
            {
              n: "02",
              title: "Leve o prêmio da etapa",
              body: "Há premiação de classificação por estado — top 2 nas etapas oficiais.",
            },
            {
              n: "03",
              title: "Dispute a final no RJ",
              body: `${basq.finals.dates} no ${basq.finals.stage}, com ${basq.finals.slots} finalistas na decisão.`,
            },
          ].map((s) => (
            <li key={s.n} className="border-l-2 border-lime/40 pl-4">
              <p className="font-display text-2xl text-lime">{s.n}</p>
              <h3 className="mt-1 font-display text-2xl text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-silver">{s.body}</p>
            </li>
          ))}
        </ol>
      </GlassPanel>

      <GlassPanel className="mt-4 overflow-hidden !rounded-2xl">
        <div className="border-b border-white/10 px-5 py-5 md:px-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-lime">
            Calendário
          </p>
          <h2 className="mt-2 font-display text-3xl text-white md:text-4xl">Classificatórias</h2>
          <p className="mt-2 text-sm text-silver">Datas, etapas e vagas para a final.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/5 text-silver">
              <tr>
                <th className="px-5 py-3 font-medium md:px-8">Quando</th>
                <th className="px-4 py-3 font-medium">Etapa</th>
                <th className="px-5 py-3 font-medium md:px-8">Classificados</th>
              </tr>
            </thead>
            <tbody>
              {basq.classificatorias.map((row) => (
                <tr key={row.stage} className="border-t border-white/10">
                  <td className="whitespace-nowrap px-5 py-3 text-silver md:px-8">{row.dates}</td>
                  <td className="px-4 py-3 font-medium text-white">{row.stage}</td>
                  <td className="px-5 py-3 text-lime md:px-8">{row.slots}</td>
                </tr>
              ))}
              <tr className="border-t border-lime/30 bg-lime/5">
                <td className="px-5 py-3 font-semibold text-white md:px-8">{basq.finals.dates}</td>
                <td className="px-4 py-3 font-semibold text-white">
                  Finais · {basq.finals.stage}
                </td>
                <td className="px-5 py-3 font-semibold text-lime md:px-8">{basq.finals.slots}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </GlassPanel>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <GlassPanel className="!rounded-2xl p-5 md:p-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-lime">
            Premiação
          </p>
          <h2 className="mt-2 font-display text-3xl text-white">Finais</h2>
          <p className="mt-2 text-sm text-silver">Prêmio individual na decisão do Rio.</p>
          <ul className="mt-6 space-y-2">
            {basq.finalsPrizes.map((p) => (
              <li
                key={p.place}
                className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 last:border-0"
              >
                <span className="text-sm text-silver">{p.place}</span>
                <span className={`font-medium ${p.amount > 0 ? "text-white" : "text-silver"}`}>
                  {p.amount > 0 ? formatBRL(p.amount) : "—"}
                </span>
              </li>
            ))}
          </ul>
        </GlassPanel>

        <GlassPanel className="!rounded-2xl p-5 md:p-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-lime">
            Premiação
          </p>
          <h2 className="mt-2 font-display text-3xl text-white">Classificatórias</h2>
          <p className="mt-2 text-sm text-silver">
            Poço estadual · total {formatBRL(basq.qualifierPrizePool)} · top 2 por etapa.
          </p>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-silver">
                <tr>
                  <th className="pb-2 font-medium">UF</th>
                  <th className="pb-2 font-medium">Total</th>
                  <th className="pb-2 font-medium">1º</th>
                  <th className="pb-2 font-medium">2º</th>
                </tr>
              </thead>
              <tbody>
                {basq.qualifierPrizes.map((q) => (
                  <tr key={q.stage} className="border-t border-white/10">
                    <td className="py-2.5 font-semibold text-lime">{q.stage}</td>
                    <td className="py-2.5 text-white">{formatBRL(q.total)}</td>
                    <td className="py-2.5 text-silver">{formatBRL(q.places[0])}</td>
                    <td className="py-2.5 text-silver">{formatBRL(q.places[1])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassPanel>
      </div>

      <GlassPanel className="mt-4 !rounded-2xl p-5 md:flex md:items-center md:justify-between md:gap-6 md:p-8">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-lime">
            Desafios Reais
          </p>
          <h2 className="mt-2 font-display text-3xl text-white">Quer entrar na grade?</h2>
          <p className="mt-2 max-w-lg text-sm text-silver">
            Crie sua conta DR, acompanhe as etapas e prepare-se para disputar a série amadora de
            sinuquinha com premiação garantida.
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-3 md:mt-0 md:shrink-0">
          <Button href="/cadastro">Criar conta</Button>
          <Button href="/desafios" variant="ghost">
            Ver desafios
          </Button>
        </div>
      </GlassPanel>

      <p className="mt-4 px-1 text-xs text-silver/70">
        Valores e calendário conforme grade BASQ 300K. Imagem de campanha © BASQ / Desafios Reais.
      </p>
    </GlassShell>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-md md:p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-silver">{label}</p>
      <p className="mt-2 font-display text-3xl text-white md:text-4xl">{value}</p>
      {hint ? <p className="mt-1 text-xs text-silver">{hint}</p> : null}
    </div>
  );
}
