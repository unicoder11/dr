import Link from "next/link";
import { type ComponentProps } from "react";

type Props = {
  href?: string;
  variant?: "primary" | "ghost";
  className?: string;
  children: React.ReactNode;
} & ComponentProps<"button">;

export function Button({
  href,
  variant = "primary",
  className = "",
  children,
  ...rest
}: Props) {
  const styles =
    variant === "primary"
      ? "lime-gradient-btn hover:brightness-110 hover:-translate-y-0.5"
      : "border border-white/20 bg-white/5 text-white backdrop-blur-md hover:border-lime/50 hover:text-lime hover:-translate-y-0.5";
  const cls = `inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold tracking-wide transition duration-300 will-change-transform ${styles} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}
