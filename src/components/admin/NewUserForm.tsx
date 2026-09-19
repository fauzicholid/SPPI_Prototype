"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";

export function NewUserForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("PROJECT_MANAGER");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not create user.");
      return;
    }
    setName("");
    setEmail("");
    setPassword("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-fit rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
        + New user
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-wrap items-end gap-3 p-4">
      <div>
        <label className="mb-1 block text-xs text-slate-500">Name</label>
        <input required value={name} onChange={(e) => setName(e.target.value)} className="rounded border border-slate-300 px-2 py-1.5 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-slate-500">Email</label>
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded border border-slate-300 px-2 py-1.5 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-slate-500">Password</label>
        <input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded border border-slate-300 px-2 py-1.5 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-slate-500">Role</label>
        <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="rounded border border-slate-300 px-2 py-1.5 text-sm">
          <option value="PROJECT_MANAGER">Project Manager</option>
          <option value="PMO_PORTFOLIO">PMO / Portfolio</option>
          <option value="RESEARCHER">Researcher</option>
          <option value="ADMIN">Admin</option>
          <option value="VIEWER">Viewer</option>
        </select>
      </div>
      <button type="submit" disabled={loading} className="rounded bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50">
        {loading ? "Creating…" : "Create"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-sm text-slate-500 hover:text-slate-800">
        Cancel
      </button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
