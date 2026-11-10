"use client";

import { motion } from "motion/react";

const ease = [0.22, 1, 0.36, 1] as const;

export function SplitHeadline({
  lines,
  className = "",
}: {
  lines: string[];
  className?: string;
}) {
  return (
    <h1 className={className}>
      {lines.map((line, li) => (
        <span key={line} className="block overflow-hidden">
          <motion.span
            className="block"
            initial={{ y: "110%", skewY: 4 }}
            animate={{ y: "0%", skewY: 0 }}
            transition={{ duration: 0.95, delay: 0.25 + li * 0.12, ease }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </h1>
  );
}
