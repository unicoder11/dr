import Image from "next/image";
import Link from "next/link";
import { GlassShell } from "@/components/layout/GlassShell";
import { PageHero } from "@/components/brand/PageHero";
import { brand } from "@/lib/brand";

export const metadata = { title: "Modalidades" };

export default function ModalidadesPage() {
  return (
    <GlassShell bg={brand.images.gravity}>
      <PageHero
        image={brand.images.gravity}
        eyebrow="DR KART · DR GRAVITY"
        title="Modalidades"
        subtitle="Duas formas de competir na primeira temporada."
        priority
      />
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <ModalityDetail
          image={brand.images.kart}
          title="Super Mountain Kart"
          body="Karts elétricos em circuito de montanha. Aceleração, ultrapassagem e gestão de curva."
          href="/desafios?modality=super-mountain-kart"
        />
        <ModalityDetail
          image={brand.images.gravity}
          title="Gravity Kart"
          body="Descidas técnicas com leitura de terreno. Menos motor, mais coragem e controle."
          href="/desafios?modality=gravity-kart"
        />
      </div>
    </GlassShell>
  );
}

function ModalityDetail({
  image,
  title,
  body,
  href,
}: {
  image: string;
  title: string;
  body: string;
  href: string;
}) {
  return (
    <Link href={href} className="glass-card group relative min-h-[56vh] overflow-hidden">
      <Image
        src={image}
        alt=""
        fill
        className="object-cover transition duration-700 group-hover:scale-105"
        sizes="(max-width: 768px) 100vw, 50vw"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-racing via-racing/55 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-7 md:p-9">
        <h2 className="font-display text-4xl tracking-wide text-white md:text-5xl">{title}</h2>
        <p className="mt-3 max-w-md text-sm text-silver">{body}</p>
        <span className="mt-5 inline-block text-sm font-semibold text-lime">Ver desafios →</span>
      </div>
    </Link>
  );
}
