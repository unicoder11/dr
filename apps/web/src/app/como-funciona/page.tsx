import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { GlassPanel } from "@/components/ui/Glass";
import { GlassShell } from "@/components/layout/GlassShell";
import { PageHero } from "@/components/brand/PageHero";
import { brand } from "@/lib/brand";

export const metadata = { title: "Como funciona" };

const steps = [
  {
    n: "01",
    title: "Crie sua conta",
    body: "Complete o perfil e escolha como quer competir — participante, creator ou influenciador.",
  },
  {
    n: "02",
    title: "Escolha o desafio",
    body: "Explore o marketplace, filtre por arena e modalidade, ou crie o seu próprio confronto.",
  },
  {
    n: "03",
    title: "Reserve e compareça",
    body: "Garanta o slot na DR Arena, faça check-in e viva a experiência presencial.",
  },
  {
    n: "04",
    title: "Resultado oficial",
    body: "Ops valida o resultado. Ranking e conquistas atualizam automaticamente.",
  },
];

export default function ComoFuncionaPage() {
  return (
    <GlassShell bg={brand.images.challenge}>
      <PageHero
        image={brand.images.challenge}
        eyebrow="EXPERIÊNCIA"
        title="Como funciona"
        subtitle="Do convite digital à linha de chegada."
        priority
      />
      <GlassPanel className="mt-4 overflow-hidden p-6 md:p-10">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <ol className="space-y-8">
            {steps.map((s) => (
              <li key={s.n} className="border-l-2 border-lime/40 pl-5">
                <p className="font-display text-2xl tracking-wide text-lime">{s.n}</p>
                <h2 className="mt-1 font-display text-3xl tracking-wide text-white">{s.title}</h2>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-silver">{s.body}</p>
              </li>
            ))}
          </ol>
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl">
            <Image
              src={brand.images.winners}
              alt="Vitória no pódio"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 40vw"
            />
          </div>
        </div>
        <div className="mt-12 flex flex-wrap gap-3">
          <Button href="/cadastro">Criar conta</Button>
          <Button href="/desafios" variant="ghost">
            Ver desafios
          </Button>
        </div>
      </GlassPanel>
    </GlassShell>
  );
}
