import type { IndicatorWeights, PdpSubItemWeights, DimensionWeights } from "./types";

/**
 * Provisional dimension split (Section 2.1 of the PRD): 0.35 / 0.30 / 0.35.
 * Verified against the worked example: 0.35*0.67 + 0.30*0.58 + 0.35*0.63 = 0.629 ≈ 0.63.
 */
export const DEFAULT_DIMENSION_WEIGHTS: DimensionWeights = {
  m: 0.35,
  k: 0.3,
  s: 0.35,
};

/** Equal weighting within each dimension, pending Stage 3 AHP/entropy calibration (FR-24/FR-25). */
export const DEFAULT_INDICATOR_WEIGHTS: IndicatorWeights = {
  SPI: 1 / 3,
  CPI: 1 / 3,
  SC: 1 / 3,
  VS: 1 / 3,
  CR: 1 / 3,
  FIR: 1 / 3,
  ACC: 1 / 4,
  XAI: 1 / 4,
  PDP: 1 / 4,
  OGC: 1 / 4,
};

/** Severity weights for the 7 statutory PDP sub-items (FR-5), summing to 1. */
export const DEFAULT_PDP_SUB_ITEM_WEIGHTS: PdpSubItemWeights = {
  lawfulBasis: 0.2,
  purposeLimitation: 0.15,
  minimization: 0.15,
  retention: 0.1,
  dpia: 0.15,
  dataSubjectRights: 0.15,
  breachNotification: 0.1,
};

const TOLERANCE = 0.001;

export function sumIsOne(values: number[]): boolean {
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.abs(sum - 1) <= TOLERANCE;
}

export function validateDimensionWeights(w: DimensionWeights): string | null {
  if (!sumIsOne([w.m, w.k, w.s])) {
    return `Dimension weights must sum to 1 (±${TOLERANCE}); got ${(w.m + w.k + w.s).toFixed(4)}.`;
  }
  return null;
}

export function validateIndicatorWeights(w: IndicatorWeights): string | null {
  const groups: [string, (keyof IndicatorWeights)[]][] = [
    ["Managerial", ["SPI", "CPI", "SC"]],
    ["Agility", ["VS", "CR", "FIR"]],
    ["Spatial-Governance", ["ACC", "XAI", "PDP", "OGC"]],
  ];
  for (const [label, codes] of groups) {
    const values = codes.map((c) => w[c]);
    if (!sumIsOne(values)) {
      return `Indicator weights for ${label} must sum to 1 (±${TOLERANCE}); got ${values.reduce((a, b) => a + b, 0).toFixed(4)}.`;
    }
  }
  return null;
}

export function validatePdpSubItemWeights(w: PdpSubItemWeights): string | null {
  const values = Object.values(w);
  if (!sumIsOne(values)) {
    return `PDP sub-item weights must sum to 1 (±${TOLERANCE}); got ${values.reduce((a, b) => a + b, 0).toFixed(4)}.`;
  }
  return null;
}
