"use client";

import Image from "next/image";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { useRef, type ReactNode } from "react";

type Props = {
  image: string;
  children: ReactNode;
};

export function ParallaxHero({ image, children }: Props) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "28%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1.12, 1.28]);
  const opacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.35]);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const smx = useSpring(mx, { stiffness: 60, damping: 18 });
  const smy = useSpring(my, { stiffness: 60, damping: 18 });
  const spotlight = useMotionTemplate`radial-gradient(520px circle at ${smx}px ${smy}px, rgba(199,240,0,0.18), transparent 55%)`;

  function onMove(e: React.MouseEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set(e.clientX - rect.left);
    my.set(e.clientY - rect.top);
  }

  return (
    <section
      ref={ref}
      onMouseMove={onMove}
      className="film-grain relative flex min-h-[100svh] items-end overflow-hidden pb-16 pt-28 md:items-center md:pb-0"
    >
      <motion.div style={{ y, scale, opacity }} className="absolute inset-0">
        <Image
          src={image}
          alt=""
          fill
          priority
          className="object-cover object-[70%_center]"
          sizes="100vw"
        />
      </motion.div>
      <div className="scrim-hero absolute inset-0" />
      <motion.div
        aria-hidden
        style={{ background: spotlight }}
        className="pointer-events-none absolute inset-0 mix-blend-screen"
      />
      <div
        aria-hidden
        className="animate-lime-pulse pointer-events-none absolute -left-24 top-1/3 h-80 w-80 rounded-full bg-lime/25 blur-3xl"
      />
      <div
        aria-hidden
        className="animate-ember-drift pointer-events-none absolute right-0 top-1/4 h-64 w-64 rounded-full bg-gold/20 blur-3xl"
      />
      <div className="relative z-10 mx-auto w-full max-w-6xl px-6">{children}</div>
      <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2">
        <div className="animate-scroll-cue flex flex-col items-center gap-2 text-[10px] uppercase tracking-[0.35em] text-silver">
          <span>Scroll</span>
          <span className="h-8 w-px bg-gradient-to-b from-lime to-transparent" />
        </div>
      </div>
    </section>
  );
}
