"use client";

import { useEffect, useState } from "react";
import { api, type ApiUser } from "@/lib/api";

export function useAdminGate() {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api
      .me()
      .then((u) => {
        if (!u.roles.includes("admin")) {
          setError("forbidden");
          return;
        }
        setUser(u);
      })
      .catch(() => setError("unauthorized"))
      .finally(() => setReady(true));
  }, []);

  return { user, error, ready };
}
