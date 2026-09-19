"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";

const ROLES: Role[] = ["PROJECT_MANAGER", "PMO_PORTFOLIO", "RESEARCHER", "ADMIN", "VIEWER"];

export function RoleSelect({ userId, currentRole, disabled }: { userId: string; currentRole: Role; disabled?: boolean }) {
  const router = useRouter();
  const [role, setRole] = useState(currentRole);
  const [loading, setLoading] = useState(false);

  async function handleChange(next: Role) {
    setLoading(true);
    setRole(next);
    await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: next }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <select
      value={role}
      disabled={disabled || loading}
      onChange={(e) => handleChange(e.target.value as Role)}
      className="rounded border border-slate-300 px-2 py-1 text-sm disabled:opacity-50"
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {r.replace("_", " ")}
        </option>
      ))}
    </select>
  );
}
