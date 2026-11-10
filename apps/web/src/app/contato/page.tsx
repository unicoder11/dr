import { GlassPanel } from "@/components/ui/Glass";
import { GlassShell } from "@/components/layout/GlassShell";
import { PageHero } from "@/components/brand/PageHero";
import { brand } from "@/lib/brand";

export const metadata = { title: "Contato" };

export default function ContatoPage() {
  return (
    <GlassShell bg={brand.images.lounge}>
      <PageHero
        image={brand.images.lounge}
        eyebrow="FALE CONOSCO"
        title="Contato"
        subtitle="Parcerias, imprensa e operação das arenas."
        priority
      />
      <GlassPanel className="mt-4 p-6 md:p-10">
        <p className="max-w-xl text-sm leading-relaxed text-silver md:text-base">
          Escreva para{" "}
          <a className="font-semibold text-lime hover:brightness-110" href="mailto:oi@desafiosreais.com">
            oi@desafiosreais.com
          </a>
          . Respostas em dias úteis.
        </p>
      </GlassPanel>
    </GlassShell>
  );
}
