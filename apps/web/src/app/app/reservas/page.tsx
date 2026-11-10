import { Suspense } from "react";
import { ReservasClient } from "./ReservasClient";

export default function ReservasPage() {
  return (
    <Suspense fallback={<div className="px-6 py-28 text-silver">Carregando...</div>}>
      <ReservasClient />
    </Suspense>
  );
}
