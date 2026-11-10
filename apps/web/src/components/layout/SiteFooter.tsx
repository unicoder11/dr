import Image from "next/image";
import Link from "next/link";
import { brand } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="relative z-10 px-4 pb-8 md:px-6">
      <div className="glass-pill mx-auto flex max-w-5xl flex-col gap-4 px-5 py-4 text-sm text-silver md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Image
            src={brand.logo}
            alt="DESAFIOS REAIS"
            width={140}
            height={44}
            className="logo-mark h-7 w-auto"
          />
          <span className="hidden text-xs tracking-wide sm:inline">
            O SEU DESAFIO. A SUA HISTÓRIA.
          </span>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/sobre" className="hover:text-lime">
            Sobre
          </Link>
          <Link href="/como-funciona" className="hover:text-lime">
            Como funciona
          </Link>
          <Link href="/contato" className="hover:text-lime">
            Contato
          </Link>
          <Link href="/privacidade" className="hover:text-lime">
            Privacidade
          </Link>
        </div>
      </div>
    </footer>
  );
}
