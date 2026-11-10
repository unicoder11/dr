"use client";

import { motion, type Variants } from "motion/react";
import type { ReactNode } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

const presets: Record<string, Variants> = {
  up: {
    hidden: { opacity: 0, y: 40 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8, ease } },
  },
  left: {
    hidden: { opacity: 0, x: -48, skewX: 6 },
    show: { opacity: 1, x: 0, skewX: 0, transition: { duration: 0.85, ease } },
  },
  right: {
    hidden: { opacity: 0, x: 48, skewX: -6 },
    show: { opacity: 1, x: 0, skewX: 0, transition: { duration: 0.85, ease } },
  },
  scale: {
    hidden: { opacity: 0, scale: 1.08 },
    show: { opacity: 1, scale: 1, transition: { duration: 1, ease } },
  },
  clip: {
    hidden: { clipPath: "inset(12% 12% 12% 12%)", opacity: 0.4, scale: 1.06 },
    show: {
      clipPath: "inset(0% 0% 0% 0%)",
      opacity: 1,
      scale: 1,
      transition: { duration: 1.1, ease },
    },
  },
};

type Props = {
  children: ReactNode;
  className?: string;
  variant?: keyof typeof presets;
  delay?: number;
  once?: boolean;
  amount?: number;
};

export function Reveal({
  children,
  className,
  variant = "up",
  delay = 0,
  once = true,
  amount = 0.35,
}: Props) {
  return (
    <motion.div
      className={className}
      variants={presets[variant]}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

export function Stagger({
  children,
  className,
  delay = 0.08,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: delay, delayChildren: 0.1 } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 28, skewX: 4 },
        show: { opacity: 1, y: 0, skewX: 0, transition: { duration: 0.7, ease } },
      }}
    >
      {children}
    </motion.div>
  );
}
