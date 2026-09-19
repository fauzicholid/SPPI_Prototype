"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewProjectForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, region }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not create project.");
      return;
    }
    setName("");
    setRegion("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-fit rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
      >
        + New project
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-wrap items-end gap-3 p-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Project name</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Region</label>
        <input
          required
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {loading ? "Creating…" : "Create"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-sm text-slate-500 hover:text-slate-800">
        Cancel
      </button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
