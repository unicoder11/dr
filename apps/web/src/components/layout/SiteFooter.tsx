import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-racing">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 text-sm text-silver md:flex-row md:items-center md:justify-between">
        <p className="font-display text-lg tracking-widest text-white">DESAFIOS REAIS</p>
        <div className="flex flex-wrap gap-5">
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
