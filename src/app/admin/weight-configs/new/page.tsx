"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_DIMENSION_WEIGHTS, DEFAULT_INDICATOR_WEIGHTS, DEFAULT_PDP_SUB_ITEM_WEIGHTS } from "@/lib/sppi/weights";
import { PDP_SUB_ITEM_LABELS } from "@/lib/sppi/indicators";

const GROUPS: { label: string; codes: (keyof typeof DEFAULT_INDICATOR_WEIGHTS)[] }[] = [
  { label: "Managerial", codes: ["SPI", "CPI", "SC"] },
  { label: "Agility", codes: ["VS", "CR", "FIR"] },
  { label: "Spatial-Governance", codes: ["ACC", "XAI", "PDP", "OGC"] },
];

function sum(values: number[]) {
  return values.reduce((a, b) => a + b, 0);
}

export default function NewWeightConfigPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [source, setSource] = useState("manual");
  const [activate, setActivate] = useState(false);
  const [dimensionWeights, setDimensionWeights] = useState({ ...DEFAULT_DIMENSION_WEIGHTS });
  const [indicatorWeights, setIndicatorWeights] = useState({ ...DEFAULT_INDICATOR_WEIGHTS });
  const [pdpWeights, setPdpWeights] = useState({ ...DEFAULT_PDP_SUB_ITEM_WEIGHTS });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const dimSum = sum([dimensionWeights.m, dimensionWeights.k, dimensionWeights.s]);
  const pdpSum = sum(Object.values(pdpWeights));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/weight-configs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, source, dimensionWeights, indicatorWeights, pdpSubItemWeights: pdpWeights, activate }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not create configuration.");
      return;
    }
    router.push("/admin/weight-configs");
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-xl font-bold text-slate-900">New Weight Configuration</h1>

      <div className="card flex flex-wrap gap-4 p-4">
        <div>
          <label className="mb-1 block text-xs text-slate-500">Name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="rounded border border-slate-300 px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Source</label>
          <select value={source} onChange={(e) => setSource(e.target.value)} className="rounded border border-slate-300 px-2 py-1 text-sm">
            <option value="manual">Manual</option>
            <option value="ahp">AHP</option>
            <option value="entropy">Entropy</option>
            <option value="delphi">Delphi</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={activate} onChange={(e) => setActivate(e.target.checked)} />
          Activate immediately
        </label>
      </div>

      <div className="card p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">
          Dimension weights <span className={dimSum > 0.999 && dimSum < 1.001 ? "text-emerald-600" : "text-red-600"}>(sum = {dimSum.toFixed(3)})</span>
        </h2>
        <div className="flex gap-4">
          {(["m", "k", "s"] as const).map((k) => (
            <div key={k}>
              <label className="mb-1 block text-xs uppercase text-slate-500">{k}</label>
              <input
                type="number"
                step="0.01"
                value={dimensionWeights[k]}
                onChange={(e) => setDimensionWeights({ ...dimensionWeights, [k]: Number(e.target.value) })}
                className="w-24 rounded border border-slate-300 px-2 py-1 text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      {GROUPS.map((g) => {
        const groupSum = sum(g.codes.map((c) => indicatorWeights[c]));
        return (
          <div key={g.label} className="card p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">
              {g.label} indicator weights{" "}
              <span className={groupSum > 0.999 && groupSum < 1.001 ? "text-emerald-600" : "text-red-600"}>(sum = {groupSum.toFixed(3)})</span>
            </h2>
            <div className="flex flex-wrap gap-4">
              {g.codes.map((c) => (
                <div key={c}>
                  <label className="mb-1 block text-xs text-slate-500">{c}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={indicatorWeights[c]}
                    onChange={(e) => setIndicatorWeights({ ...indicatorWeights, [c]: Number(e.target.value) })}
                    className="w-24 rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="card p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">
          PDP sub-item severity weights <span className={pdpSum > 0.999 && pdpSum < 1.001 ? "text-emerald-600" : "text-red-600"}>(sum = {pdpSum.toFixed(3)})</span>
        </h2>
        <div className="flex flex-wrap gap-4">
          {(Object.keys(pdpWeights) as (keyof typeof pdpWeights)[]).map((k) => (
            <div key={k}>
              <label className="mb-1 block w-32 text-xs text-slate-500">{PDP_SUB_ITEM_LABELS[k].en}</label>
              <input
                type="number"
                step="0.01"
                value={pdpWeights[k]}
                onChange={(e) => setPdpWeights({ ...pdpWeights, [k]: Number(e.target.value) })}
                className="w-24 rounded border border-slate-300 px-2 py-1 text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-fit rounded bg-slate-900 px-6 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {loading ? "Saving…" : "Create configuration"}
      </button>
    </form>
  );
}
