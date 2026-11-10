"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminGate } from "@/components/admin/AdminGate";
import { AdminShell, AdminTable } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/Button";
import { api, type AdminUser } from "@/lib/api";

const ALL_ROLES = ["participant", "creator", "organizer", "arena_operator", "admin"] as const;

export default function AdminUsersPage() {
  return (
    <AdminGate>
      {() => <UsersPanel />}
    </AdminGate>
  );
}

function UsersPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [rolePick, setRolePick] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    return api
      .adminUsers()
      .then(setUsers)
      .catch((e) => setError(e instanceof Error ? e.message : "erro"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function grant(id: string) {
    const role = rolePick[id];
    if (!role) return;
    setBusy(id);
    try {
      await api.adminGrantRole(id, role);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro");
    } finally {
      setBusy(null);
    }
  }

  async function revoke(id: string, role: string) {
    setBusy(`${id}:${role}`);
    try {
      await api.adminRevokeRole(id, role);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminShell
      title="Usuários"
      subtitle="Roles, status e permissões da plataforma"
    >
      {error && <p className="mb-4 text-red-400">{error}</p>}
      <AdminTable>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/5 text-silver">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Roles</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-white/10 align-top">
                <td className="px-4 py-3 text-white">
                  {u.display_name}
                  <div className="text-xs text-silver">@{u.username}</div>
                </td>
                <td className="px-4 py-3 text-silver">{u.email}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(u.roles || []).map((r) => (
                      <button
                        key={r}
                        type="button"
                        disabled={busy === `${u.id}:${r}`}
                        onClick={() => revoke(u.id, r)}
                        className="rounded-full border border-lime/30 bg-lime/10 px-2 py-0.5 text-xs text-lime hover:border-red-400 hover:bg-red-500/10 hover:text-red-300"
                        title="Revogar role"
                      >
                        {r} ×
                      </button>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-silver">{u.status}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className="rounded-full border border-white/15 bg-racing/80 px-3 py-1.5 text-xs text-white"
                      value={rolePick[u.id] || ""}
                      onChange={(e) =>
                        setRolePick((prev) => ({ ...prev, [u.id]: e.target.value }))
                      }
                    >
                      <option value="">Role…</option>
                      {ALL_ROLES.filter((r) => !(u.roles || []).includes(r)).map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <Button
                      className="!px-3 !py-1.5 text-xs"
                      disabled={!rolePick[u.id] || busy === u.id}
                      onClick={() => grant(u.id)}
                    >
                      Grant
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTable>
    </AdminShell>
  );
}
