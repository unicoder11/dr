"use client";

export function SpeedField({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div className="speed-lines absolute inset-0 opacity-40" />
      <div className="speed-sweep absolute inset-y-0 -left-1/3 w-1/3 opacity-30" />
      <div className="diagonal-stripes absolute inset-0 opacity-[0.07]" />
    </div>
  );
}
