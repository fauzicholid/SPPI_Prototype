import type { IndicatorScore, SubItemScore, WeightConfig } from "@prisma/client";
import type { DimensionWeights, IndicatorInput, IndicatorWeights, PdpSubItemWeights } from "./types";
import { INDICATORS } from "./indicators";

type ScoreWithSubItems = IndicatorScore & { subItems: SubItemScore[] };

export function indicatorScoresToInputs(scores: ScoreWithSubItems[]): IndicatorInput[] {
  return scores.map((s) => ({
    code: s.indicatorCode,
    mode: s.inputMode,
    rubricLevel: s.rubricLevel ?? undefined,
    rawValues: (s.rawValues as Record<string, number> | null) ?? undefined,
    subItems:
      s.subItems.length > 0
        ? Object.fromEntries(s.subItems.map((si) => [si.itemCode, si.score]))
        : undefined,
  }));
}

export function weightConfigToParams(wc: WeightConfig): {
  indicatorWeights: IndicatorWeights;
  dimensionWeights: DimensionWeights;
  pdpSubItemWeights: PdpSubItemWeights;
} {
  return {
    indicatorWeights: wc.indicatorWeights as unknown as IndicatorWeights,
    dimensionWeights: wc.dimensionWeights as unknown as DimensionWeights,
    pdpSubItemWeights: wc.pdpSubItemWeights as unknown as PdpSubItemWeights,
  };
}

/** All 10 indicator codes that must be present before calculation (FR-7). */
export const ALL_INDICATOR_CODES = Object.keys(INDICATORS) as Array<keyof typeof INDICATORS>;
