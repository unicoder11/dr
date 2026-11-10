import Image from "next/image";

type Props = {
  image: string;
  title: string;
  subtitle?: string;
  priority?: boolean;
  eyebrow?: string;
};

/** Cinematic bleed hero inside glass — image edge-to-edge, copy over scrim */
export function PageHero({ image, title, subtitle, priority, eyebrow }: Props) {
  return (
    <div className="glass-panel relative min-h-[40vh] overflow-hidden md:min-h-[52vh]">
      <Image
        src={image}
        alt=""
        fill
        priority={priority}
        className="object-cover object-center"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-racing via-racing/75 to-racing/25" />
      <div className="absolute inset-0 bg-gradient-to-t from-racing/90 via-transparent to-racing/20" />
      <div className="relative z-10 flex min-h-[40vh] flex-col justify-end p-5 md:min-h-[52vh] md:p-10 lg:p-12">
        {eyebrow ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-lime sm:text-[11px] sm:tracking-[0.4em]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-2 max-w-3xl font-display text-4xl uppercase tracking-wide text-white sm:text-5xl md:text-7xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-3 max-w-xl text-sm font-medium leading-relaxed text-silver md:mt-4 md:text-base">
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}
