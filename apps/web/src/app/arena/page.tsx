import { BookingWidget } from "@/components/booking/BookingWidget";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "DR Arena" };

export default function ArenaPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-28">
      <p className="font-display tracking-[0.25em] text-lime">DR ARENA</p>
      <h1 className="mt-3 font-display text-5xl text-white md:text-6xl">
        Super Mountain Kart
      </h1>
      <p className="mt-5 max-w-2xl text-silver">
        Circuito aproximado de 2 km com karts elétricos, gravity kart e DR Lounge. A
        primeira unidade física do ecossistema DESAFIOS REAIS.
      </p>
      <div className="mt-8 flex gap-3">
        <Button href="/app/reservas">Ir para reservas</Button>
        <Button href="/desafios" variant="ghost">
          Ver desafios
        </Button>
      </div>
      <div className="mt-12">
        <BookingWidget />
      </div>
    </div>
  );
}
