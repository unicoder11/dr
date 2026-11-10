"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";

type AdminUser = {
  id: string;
  email: string;
  username: string;
  display_name: string;
  roles: string[];
  status: string;
};

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .me()
      .then((u) => {
        if (!u.roles.includes("admin")) {
          setError("forbidden");
          return;
        }
        return api.adminUsers() as Promise<AdminUser[]>;
      })
      .then((list) => {
        if (list) setUsers(list);
      })
      .catch(() => setError("unauthorized"));
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-6 py-32 text-center">
        <p className="text-silver">Acesso admin indisponível ({error}).</p>
        <Button href="/entrar" className="mt-6">
          Entrar
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-28">
      <h1 className="font-display text-5xl text-white">Admin</h1>
      <p className="mt-2 text-silver">Usuários e roles (Fase 1).</p>
      <div className="mt-8 overflow-x-auto border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-graphite text-silver">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Roles</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-white/10">
                <td className="px-4 py-3 text-white">
                  {u.display_name}
                  <div className="text-xs text-silver">@{u.username}</div>
                </td>
                <td className="px-4 py-3 text-silver">{u.email}</td>
                <td className="px-4 py-3 text-lime">{(u.roles || []).join(", ")}</td>
                <td className="px-4 py-3 text-silver">{u.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
