"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminGate } from "@/components/admin/AdminGate";
import { AdminShell, AdminTable } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/Button";
import { api, type Modality } from "@/lib/api";

export default function AdminModalidadesPage() {
  return (
    <AdminGate>
      {() => <ModalidadesPanel />}
    </AdminGate>
  );
}

function ModalidadesPanel() {
  const [list, setList] = useState<Modality[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    return api
      .adminModalities()
      .then(setList)
      .catch((e) => setError(e instanceof Error ? e.message : "erro"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(id: string, active: boolean) {
    setBusy(id);
    try {
      await api.adminSetModality(id, active);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminShell
      title="Modalidades"
      subtitle="Ativar / desativar categorias esportivas (scope lock MVP)"
    >
      {error && <p className="mb-4 text-red-400">{error}</p>}
      <AdminTable>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/5 text-silver">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Ação</th>
            </tr>
          </thead>
          <tbody>
            {list.map((m) => (
              <tr key={m.id} className="border-t border-white/10">
                <td className="px-4 py-3 text-white">{m.name}</td>
                <td className="px-4 py-3 text-silver">{m.slug}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-semibold uppercase ${
                      m.is_active ? "text-lime" : "text-silver"
                    }`}
                  >
                    {m.is_active ? "Ativa" : "Inativa"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Button
                    variant="ghost"
                    className="!px-3 !py-1.5 text-xs"
                    disabled={busy === m.id}
                    onClick={() => toggle(m.id, !m.is_active)}
                  >
                    {m.is_active ? "Desativar" : "Ativar"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTable>
    </AdminShell>
  );
}
