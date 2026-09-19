import type { ClassificationBand } from "@/lib/sppi/types";

export const BAND_LABEL: Record<ClassificationBand, string> = {
  VERY_LOW: "Very Low",
  LOW: "Low",
  MODERATE: "Moderate",
  HIGH: "High",
  VERY_HIGH: "Very High",
};

export const BAND_COLOR: Record<ClassificationBand, string> = {
  VERY_LOW: "#dc2626",
  LOW: "#f97316",
  MODERATE: "#eab308",
  HIGH: "#22c55e",
  VERY_HIGH: "#0ea5e9",
};

export function BandBadge({ band, action }: { band: ClassificationBand; action?: string }) {
  return (
    <span className="band-badge" style={{ backgroundColor: BAND_COLOR[band] }}>
      {BAND_LABEL[band].toUpperCase()}
      {action ? ` — ${action}` : ""}
    </span>
  );
}
