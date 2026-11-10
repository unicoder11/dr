import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="font-display text-2xl tracking-[0.12em] text-white">
          DESAFIOS REAIS
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-silver md:flex">
          <Link href="/desafios" className="transition hover:text-lime">
            Desafios
          </Link>
          <Link href="/arena" className="transition hover:text-lime">
            Arena
          </Link>
          <Link href="/modalidades" className="transition hover:text-lime">
            Modalidades
          </Link>
          <Link href="/rankings" className="transition hover:text-lime">
            Rankings
          </Link>
          <Link href="/entrar" className="transition hover:text-lime">
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="rounded-sm bg-lime px-4 py-2 font-semibold text-racing transition hover:brightness-110"
          >
            Criar conta
          </Link>
        </nav>
        <Link
          href="/cadastro"
          className="rounded-sm bg-lime px-3 py-2 text-sm font-semibold text-racing md:hidden"
        >
          Conta
        </Link>
      </div>
    </header>
  );
}
