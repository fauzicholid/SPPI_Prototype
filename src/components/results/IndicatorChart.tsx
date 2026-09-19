"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { IndicatorCode } from "@/lib/sppi/types";

const DIMENSION_COLOR: Record<string, string> = {
  MANAGERIAL: "#0ea5e9",
  AGILITY: "#22c55e",
  SPATIAL_GOVERNANCE: "#f97316",
};

interface Datum {
  code: IndicatorCode;
  name: string;
  dimension: string;
  value: number;
}

export function IndicatorChart({ data, weakest }: { data: Datum[]; weakest: IndicatorCode }) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="code" tick={{ fontSize: 12 }} interval={0} angle={-30} textAnchor="end" height={50} />
          <YAxis domain={[0, 1]} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value: number) => value.toFixed(2)}
            labelFormatter={(label, payload) => payload?.[0]?.payload?.name ?? label}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((d) => (
              <Cell
                key={d.code}
                fill={DIMENSION_COLOR[d.dimension] ?? "#64748b"}
                stroke={d.code === weakest ? "#dc2626" : undefined}
                strokeWidth={d.code === weakest ? 3 : 0}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex gap-4 text-xs text-slate-500">
        <LegendDot color={DIMENSION_COLOR.MANAGERIAL} label="Managerial" />
        <LegendDot color={DIMENSION_COLOR.AGILITY} label="Agility" />
        <LegendDot color={DIMENSION_COLOR.SPATIAL_GOVERNANCE} label="Spatial Governance" />
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full border-2 border-red-600" /> Weakest indicator
        </span>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
