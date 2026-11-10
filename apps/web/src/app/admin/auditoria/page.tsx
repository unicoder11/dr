"use client";

import { useEffect, useState } from "react";
import { AdminGate } from "@/components/admin/AdminGate";
import { AdminShell, AdminTable } from "@/components/admin/AdminShell";
import { api, type AdminAuditRow } from "@/lib/api";

export default function AdminAuditoriaPage() {
  return (
    <AdminGate>
      {() => <AuditPanel />}
    </AdminGate>
  );
}

function AuditPanel() {
  const [rows, setRows] = useState<AdminAuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .adminAudit()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "erro"));
  }, []);

  return (
    <AdminShell title="Auditoria" subtitle="Últimas 100 ações administrativas">
      {error && <p className="mb-4 text-red-400">{error}</p>}
      <AdminTable>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/5 text-silver">
            <tr>
              <th className="px-4 py-3 font-medium">Quando</th>
              <th className="px-4 py-3 font-medium">Actor</th>
              <th className="px-4 py-3 font-medium">Ação</th>
              <th className="px-4 py-3 font-medium">Entidade</th>
              <th className="px-4 py-3 font-medium">Payload</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-silver">
                  Sem eventos.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-white/10 align-top">
                <td className="px-4 py-3 text-xs text-silver whitespace-nowrap">
                  {new Date(r.created_at).toLocaleString("pt-BR")}
                </td>
                <td className="px-4 py-3 text-silver">
                  {r.actor_username ? `@${r.actor_username}` : "—"}
                </td>
                <td className="px-4 py-3 text-lime">{r.action}</td>
                <td className="px-4 py-3 text-white">
                  {r.entity_type}
                  <div className="font-mono text-xs text-silver">{r.entity_id}</div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-silver max-w-xs truncate">
                  {typeof r.payload === "string"
                    ? r.payload
                    : JSON.stringify(r.payload || {})}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTable>
    </AdminShell>
  );
}
