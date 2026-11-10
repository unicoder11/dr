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
      ? "bg-lime text-racing hover:brightness-110"
      : "border border-white/20 text-white hover:border-lime hover:text-lime";
  const cls = `inline-flex items-center justify-center rounded-sm px-5 py-3 text-sm font-semibold tracking-wide transition ${styles} ${className}`;
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
