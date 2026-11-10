import Image from "next/image";
import { GlassPanel } from "@/components/ui/Glass";
import { GlassShell } from "@/components/layout/GlassShell";
import { PageHero } from "@/components/brand/PageHero";
import { brand } from "@/lib/brand";

export const metadata = { title: "Sobre" };

export default function SobrePage() {
  return (
    <GlassShell bg={brand.images.lounge}>
      <PageHero
        image={brand.images.lounge}
        eyebrow="A MARCA"
        title="Sobre"
        subtitle="Conectamos o digital ao presencial — pessoas, arenas e competição real."
        priority
      />
      <GlassPanel className="mt-4 overflow-hidden p-6 md:p-10">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="font-display text-4xl tracking-wide text-white md:text-5xl">
              Entretenimento competitivo brasileiro
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-silver md:text-base">
              Não é só um app de ranking. É um ecossistema onde criar um desafio, reservar uma
              bateria e cruzar a linha de chegada fazem parte da mesma história.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-silver md:text-base">
              Começamos pela Super Mountain Kart e abrimos caminho para múltiplas arenas e
              modalidades — sempre com operação real, resultado oficial e comunidade.
            </p>
          </div>
          <div className="relative aspect-[16/11] overflow-hidden rounded-2xl">
            <Image
              src={brand.images.sunset}
              alt="Complexo de kart ao pôr do sol"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </GlassPanel>
    </GlassShell>
  );
}
