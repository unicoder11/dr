import { Suspense } from "react";
import { CadastroClient } from "./CadastroClient";

export default function CadastroPage() {
  return (
    <Suspense fallback={<div className="px-6 py-28 text-center text-silver">Carregando...</div>}>
      <CadastroClient />
    </Suspense>
  );
}
