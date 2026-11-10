"use client";

import { motion } from "motion/react";

/** Ambient lime sparks — continuous life without cluttering content */
export function LiveSpark({ className = "" }: { className?: string }) {
  const sparks = Array.from({ length: 12 }, (_, i) => i);
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {sparks.map((i) => (
        <motion.span
          key={i}
          className="absolute h-1 w-1 rounded-full bg-lime"
          style={{
            left: `${8 + ((i * 17) % 84)}%`,
            top: `${12 + ((i * 29) % 70)}%`,
            boxShadow: "0 0 12px rgba(199,240,0,0.8)",
          }}
          animate={{
            opacity: [0, 1, 0],
            y: [0, -30 - (i % 5) * 8],
            scale: [0.4, 1.2, 0.2],
          }}
          transition={{
            duration: 2.8 + (i % 4) * 0.5,
            repeat: Infinity,
            delay: i * 0.35,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}
