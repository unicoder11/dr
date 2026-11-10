"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { useAdminGate } from "./useAdminGate";

export function AdminGate({ children }: { children: (user: NonNullable<ReturnType<typeof useAdminGate>["user"]>) => ReactNode }) {
  const { user, error, ready } = useAdminGate();

  if (!ready) {
    return (
      <div className="mx-auto max-w-lg px-6 py-32 text-center text-silver">
        Carregando admin…
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="mx-auto max-w-lg px-6 py-32 text-center">
        <p className="text-silver">Acesso admin indisponível ({error || "forbidden"}).</p>
        <Button href="/entrar" className="mt-6">
          Entrar
        </Button>
      </div>
    );
  }

  return <>{children(user)}</>;
}
