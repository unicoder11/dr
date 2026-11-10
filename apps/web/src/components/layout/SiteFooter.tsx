import Image from "next/image";
import Link from "next/link";
import { brand } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="relative z-10 px-3 pb-6 md:px-6 md:pb-8">
      <div className="glass-pill mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3.5 text-sm text-silver md:flex-row md:items-center md:justify-between md:gap-4 md:px-5 md:py-4">
        <div className="flex items-center gap-3">
          <Image
            src={brand.logo}
            alt="DESAFIOS REAIS"
            width={140}
            height={44}
            className="logo-mark h-6 w-auto md:h-7"
          />
          <span className="hidden text-xs tracking-wide sm:inline">
            O SEU DESAFIO. A SUA HISTÓRIA.
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs sm:text-sm md:gap-x-5">
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
