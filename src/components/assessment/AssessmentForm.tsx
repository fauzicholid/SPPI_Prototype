"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DIMENSION_META,
  DIMENSION_ORDER,
  INDICATORS,
  INDICATOR_CODES,
  PDP_SUB_ITEM_LABELS,
  XAI_CONDITION_LABELS,
} from "@/lib/sppi/indicators";
import { PDP_SUB_ITEMS, XAI_CONDITIONS } from "@/lib/sppi/types";
import type { IndicatorCode, InputMode } from "@/lib/sppi/types";

interface IndicatorState {
  mode: InputMode;
  rubricLevel: number | null;
  rawValues: Record<string, string>;
  subItems: Record<string, number | null>;
  justificationNote: string;
  normalizedValue: number | null;
  saving: boolean;
  error: string | null;
}

function emptyState(code: IndicatorCode): IndicatorState {
  const def = INDICATORS[code];
  const rawValues: Record<string, string> = {};
  (def.preciseFields ?? []).forEach((f) => (rawValues[f.key] = ""));
  const subItems: Record<string, number | null> = {};
  if (def.structured === "PDP") PDP_SUB_ITEMS.forEach((k) => (subItems[k] = null));
  if (def.structured === "XAI") XAI_CONDITIONS.forEach((k) => (subItems[k] = null));
  return {
    mode: "QUICK",
    rubricLevel: null,
    rawValues,
    subItems,
    justificationNote: "",
    normalizedValue: null,
    saving: false,
    error: null,
  };
}

function isComplete(code: IndicatorCode, s: IndicatorState): boolean {
  const def = INDICATORS[code];
  if (s.mode === "QUICK") return s.rubricLevel != null;
  if (def.structured) return Object.values(s.subItems).every((v) => v != null);
  return (def.preciseFields ?? []).every((f) => s.rawValues[f.key].trim() !== "" && !Number.isNaN(Number(s.rawValues[f.key])));
}

export function AssessmentForm({ projectId, assessmentId }: { projectId: string; assessmentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState("");
  const [cycleLabel, setCycleLabel] = useState("");
  const [states, setStates] = useState<Record<IndicatorCode, IndicatorState>>(() =>
    Object.fromEntries(INDICATOR_CODES.map((c) => [c, emptyState(c)])) as Record<IndicatorCode, IndicatorState>
  );
  const [calcError, setCalcError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/assessments/${assessmentId}`);
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const { assessment } = await res.json();
      setProjectName(assessment.project.name);
      setCycleLabel(assessment.cycleLabel);

      setStates((prev) => {
        const next = { ...prev };
        for (const score of assessment.indicatorScores) {
          const code = score.indicatorCode as IndicatorCode;
          const def = INDICATORS[code];
          const base = emptyState(code);
          base.mode = score.inputMode;
          base.justificationNote = score.justificationNote ?? "";
          base.normalizedValue = score.normalizedValue;
          if (score.inputMode === "QUICK") {
            base.rubricLevel = score.rubricLevel;
          } else if (def.structured) {
            const items: Record<string, number> = Object.fromEntries(
              score.subItems.map((si: { itemCode: string; score: number }) => [si.itemCode, si.score])
            );
            base.subItems = { ...base.subItems, ...items };
          } else if (score.rawValues) {
            const raw: Record<string, number> = score.rawValues;
            base.rawValues = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, String(v)]));
          }
          next[code] = base;
        }
        return next;
      });
      setLoading(false);
    })();
  }, [assessmentId]);

  function updateState(code: IndicatorCode, patch: Partial<IndicatorState>) {
    setStates((prev) => ({ ...prev, [code]: { ...prev[code], ...patch } }));
  }

  async function saveIndicator(code: IndicatorCode) {
    const s = states[code];
    if (!isComplete(code, s)) return;
    updateState(code, { saving: true, error: null });

    const def = INDICATORS[code];
    let entry: Record<string, unknown>;
    if (s.mode === "QUICK") {
      entry = { code, mode: "QUICK", rubricLevel: s.rubricLevel, justificationNote: s.justificationNote || null };
    } else if (def.structured) {
      entry = { code, mode: "PRECISE", subItems: s.subItems, justificationNote: s.justificationNote || null };
    } else {
      const rawValues = Object.fromEntries(Object.entries(s.rawValues).map(([k, v]) => [k, Number(v)]));
      entry = { code, mode: "PRECISE", rawValues, justificationNote: s.justificationNote || null };
    }

    const res = await fetch(`/api/assessments/${assessmentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ indicators: [entry] }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      updateState(code, { saving: false, error: body.error ?? "Could not save." });
      return;
    }
    const body = await res.json();
    const computed = body.computed?.[0];
    updateState(code, { saving: false, error: null, normalizedValue: computed?.normalizedValue ?? null });
  }

  const completedCount = INDICATOR_CODES.filter((c) => states[c].normalizedValue != null).length;
  const allComplete = completedCount === 10;

  const missing = useMemo(
    () => INDICATOR_CODES.filter((c) => states[c].normalizedValue == null).map((c) => INDICATORS[c].nameEn),
    [states]
  );

  async function handleCalculate() {
    setCalculating(true);
    setCalcError(null);
    const res = await fetch(`/api/assessments/${assessmentId}/calculate`, { method: "POST" });
    setCalculating(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setCalcError(body.error ?? "Could not calculate.");
      return;
    }
    router.push(`/projects/${projectId}/results/${assessmentId}`);
  }

  if (loading) return <p className="text-sm text-slate-500">Loading assessment…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{projectName}</h1>
        <p className="text-sm text-slate-500">Assessment cycle {cycleLabel} — {completedCount}/10 indicators answered</p>
      </div>

      {DIMENSION_ORDER.map((dim) => (
        <div key={dim} className="card overflow-hidden">
          <div className="bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">{DIMENSION_META[dim].nameEn}</div>
          <div className="divide-y divide-slate-100">
            {DIMENSION_META[dim].indicators.map((code) => (
              <IndicatorRow
                key={code}
                code={code}
                state={states[code]}
                onChange={(patch) => updateState(code, patch)}
                onSave={() => saveIndicator(code)}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="card flex flex-col gap-2 p-4">
        {!allComplete && (
          <p className="text-sm text-slate-500">
            Still unanswered: <span className="font-medium text-slate-700">{missing.join(", ")}</span>
          </p>
        )}
        {calcError && <p className="text-sm text-red-600">{calcError}</p>}
        <button
          onClick={handleCalculate}
          disabled={!allComplete || calculating}
          className="w-fit rounded bg-sky-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {calculating ? "Calculating…" : "Calculate SPPI"}
        </button>
      </div>
    </div>
  );
}

function IndicatorRow({
  code,
  state,
  onChange,
  onSave,
}: {
  code: IndicatorCode;
  state: IndicatorState;
  onChange: (patch: Partial<IndicatorState>) => void;
  onSave: () => void;
}) {
  const def = INDICATORS[code];

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-slate-900">
            {def.nameEn} <span className="text-slate-400">({code})</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {state.normalizedValue != null && (
            <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              normalized {state.normalizedValue.toFixed(2)}
            </span>
          )}
          <div className="flex overflow-hidden rounded border border-slate-300 text-xs">
            <button
              className={`px-3 py-1 ${state.mode === "QUICK" ? "bg-slate-900 text-white" : "bg-white text-slate-600"}`}
              onClick={() => onChange({ mode: "QUICK" })}
            >
              Quick
            </button>
            {(def.preciseFields || def.structured) && (
              <button
                className={`px-3 py-1 ${state.mode === "PRECISE" ? "bg-slate-900 text-white" : "bg-white text-slate-600"}`}
                onClick={() => onChange({ mode: "PRECISE" })}
              >
                Precise
              </button>
            )}
          </div>
        </div>
      </div>

      {state.mode === "QUICK" ? (
        <div className="flex flex-wrap gap-2">
          {def.quickAnchors.map((a) => (
            <button
              key={a.level}
              title={a.en}
              aria-pressed={state.rubricLevel === a.level}
              onClick={() => onChange({ rubricLevel: a.level })}
              className={`rounded border px-3 py-1.5 text-xs ${
                state.rubricLevel === a.level
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
              }`}
            >
              Level {a.level}
            </button>
          ))}
        </div>
      ) : def.structured === "PDP" ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PDP_SUB_ITEMS.map((key) => (
            <div key={key} className="flex items-center justify-between gap-2 rounded border border-slate-200 px-3 py-1.5">
              <span className="text-xs text-slate-600">{PDP_SUB_ITEM_LABELS[key].en}</span>
              <div className="flex gap-1">
                {[0, 0.5, 1].map((v) => (
                  <button
                    key={v}
                    onClick={() => onChange({ subItems: { ...state.subItems, [key]: v } })}
                    className={`rounded px-2 py-0.5 text-xs ${
                      state.subItems[key] === v ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : def.structured === "XAI" ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {XAI_CONDITIONS.map((key) => (
            <div key={key} className="flex items-center justify-between gap-2 rounded border border-slate-200 px-3 py-1.5">
              <span className="text-xs text-slate-600">{XAI_CONDITION_LABELS[key].en}</span>
              <div className="flex gap-1">
                {[
                  { v: 0, label: "No" },
                  { v: 1, label: "Yes" },
                ].map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => onChange({ subItems: { ...state.subItems, [key]: opt.v } })}
                    className={`rounded px-2 py-0.5 text-xs ${
                      state.subItems[key] === opt.v ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {(def.preciseFields ?? []).map((f) => (
            <div key={f.key}>
              <label className="mb-1 block text-xs text-slate-500">{f.labelEn}</label>
              <input
                type="number"
                step="any"
                value={state.rawValues[f.key] ?? ""}
                onChange={(e) => onChange({ rawValues: { ...state.rawValues, [f.key]: e.target.value } })}
                className="w-32 rounded border border-slate-300 px-2 py-1 text-sm"
              />
            </div>
          ))}
        </div>
      )}
      {state.mode === "PRECISE" && def.preciseHelpEn && <p className="text-xs text-slate-400">{def.preciseHelpEn}</p>}

      <div className="flex items-center gap-3">
        <input
          placeholder="Justification note (optional)"
          value={state.justificationNote}
          onChange={(e) => onChange({ justificationNote: e.target.value })}
          className="flex-1 rounded border border-slate-200 px-2 py-1 text-xs"
        />
        <button
          onClick={onSave}
          disabled={!isComplete(code, state) || state.saving}
          className="rounded bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-40"
        >
          {state.saving ? "Saving…" : "Save"}
        </button>
        {state.error && <span className="text-xs text-red-600">{state.error}</span>}
      </div>
    </div>
  );
}
