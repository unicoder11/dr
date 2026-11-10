import { Button } from "@/components/ui/Button";

export default function HomePage() {
  return (
    <>
      <section className="hero-surface relative flex min-h-screen items-end overflow-hidden pb-20 pt-28 md:items-center md:pb-0">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(90deg, transparent 0%, transparent 48%, rgba(183,255,0,0.05) 50%, transparent 52%), linear-gradient(0deg, #080d11 0%, transparent 35%)",
          }}
        />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-6">
          <p className="animate-hero font-display text-lime text-xl tracking-[0.35em] md:text-2xl">
            DESAFIOS REAIS
          </p>
          <h1 className="animate-hero-delay mt-4 max-w-4xl font-display text-5xl leading-none text-white md:text-7xl lg:text-8xl">
            O SEU DESAFIO.
            <br />
            A SUA HISTÓRIA.
          </h1>
          <p className="animate-hero-delay mt-6 max-w-xl text-base text-silver md:text-lg">
            Uma nova forma de competir, desafiar pessoas e viver experiências reais —
            começando na Super Mountain Kart.
          </p>
          <div className="animate-hero-delay mt-10 flex flex-wrap gap-4">
            <Button href="/desafios">Explorar desafios</Button>
            <Button href="/cadastro" variant="ghost">
              Criar meu desafio
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-racing py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-4xl tracking-wide text-white md:text-5xl">
            Como funciona
          </h2>
          <p className="mt-3 max-w-2xl text-silver">
            Descubra desafios, reserve experiências presenciais e registre resultados oficiais.
          </p>
          <ol className="mt-12 grid gap-10 md:grid-cols-3">
            {[
              ["01", "Desafie", "Crie ou aceite um confronto na modalidade kart ou gravity."],
              ["02", "Compita", "Reserve sua bateria na DR Arena e viva o evento presencial."],
              ["03", "Vença", "Resultados validados entram no ranking da temporada."],
            ].map(([n, t, d]) => (
              <li key={n}>
                <p className="font-display text-lime text-3xl">{n}</p>
                <h3 className="mt-3 font-display text-2xl text-white">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-silver">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-white/10 bg-graphite/40 py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-2 md:items-end">
          <div>
            <p className="font-display text-lime tracking-[0.2em]">DR ARENA</p>
            <h2 className="mt-3 font-display text-4xl text-white md:text-5xl">
              Super Mountain Kart
            </h2>
            <p className="mt-4 max-w-md text-silver">
              Circuito de montanha, karts elétricos e gravity kart. A primeira arena do
              ecossistema DESAFIOS REAIS.
            </p>
          </div>
          <div className="flex justify-start md:justify-end">
            <Button href="/arena">Conhecer a arena</Button>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 py-24">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="font-display text-4xl text-white md:text-6xl">
            Pronto para competir?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-silver">
            Crie sua conta e entre no calendário de desafios da Super Mountain Kart.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Button href="/cadastro">Criar conta</Button>
            <Button href="/desafios" variant="ghost">
              Ver desafios
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
