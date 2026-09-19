"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function defaultCycleLabel() {
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  return `${now.getFullYear()}-Q${quarter}`;
}

export function NewAssessmentButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, cycleLabel: defaultCycleLabel() }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not start assessment.");
      return;
    }
    const { assessment } = await res.json();
    router.push(`/projects/${projectId}/assess/${assessment.id}`);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {loading ? "Starting…" : "+ New assessment"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
