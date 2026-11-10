import Image from "next/image";
import type { ReactNode } from "react";
import { brand } from "@/lib/brand";

type Props = {
  children: ReactNode;
  bg?: string;
  className?: string;
};

/** Shared cinematic world + glass stage for interior pages */
export function GlassShell({
  children,
  bg = brand.images.challenge,
  className = "",
}: Props) {
  return (
    <div className={`relative min-h-[100svh] overflow-hidden ${className}`}>
      <div className="fixed inset-0 -z-10">
        <Image
          src={bg}
          alt=""
          fill
          priority
          className="scale-110 object-cover blur-md brightness-[0.32]"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-racing/70" />
        <div className="animate-glow-breathe absolute -left-16 top-1/3 h-72 w-72 rounded-full bg-lime/20" />
      </div>
      <div className="mx-auto max-w-[1280px] px-3 pb-8 pt-[5.5rem] md:px-6 md:pb-10 md:pt-28">
        {children}
      </div>
    </div>
  );
}
