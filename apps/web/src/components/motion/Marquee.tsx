"use client";

type Props = {
  items: string[];
  className?: string;
  speed?: number;
};

export function Marquee({ items, className = "", speed = 28 }: Props) {
  const row = [...items, ...items];
  return (
    <div
      className={`relative overflow-hidden border-y border-lime/25 bg-racing ${className}`}
      aria-hidden
    >
      <div className="checkered-rail absolute inset-x-0 top-0 h-1.5" />
      <div className="checkered-rail absolute inset-x-0 bottom-0 h-1.5" />
      <div
        className="animate-marquee flex w-max whitespace-nowrap py-4"
        style={{ animationDuration: `${speed}s` }}
      >
        {row.map((t, i) => (
          <span
            key={`${t}-${i}`}
            className="mx-6 inline-flex items-center gap-6 font-display text-2xl tracking-[0.12em] text-cream md:text-3xl"
          >
            <span className="text-lime">■</span>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
