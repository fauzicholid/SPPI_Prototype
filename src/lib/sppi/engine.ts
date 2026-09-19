import { DIMENSION_META, INDICATORS } from "./indicators";
import { PDP_SUB_ITEMS, XAI_CONDITIONS } from "./types";
import type {
  ClassificationBand,
  DimensionCode,
  IndicatorCode,
  IndicatorComputed,
  IndicatorInput,
  IndicatorWeights,
  PdpSubItemWeights,
  DimensionWeights,
  SPPIComputationResult,
} from "./types";

export function clamp(value: number, min = 0, max = 1): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Stage 2 normalization: distance-to-target, target defaults to 1.0 (on-plan). */
function normalizeDistanceToTarget(value: number, target = 1): number {
  return clamp(1 - Math.abs(value - target));
}

/** FR-3: Quick mode fixed linear mapping, Level 1 = 0.00 ... Level 5 = 1.00. */
export function normalizeRubricLevel(level: number): number {
  return clamp((level - 1) / 4);
}

export class IndicatorInputError extends Error {
  constructor(public code: IndicatorCode, message: string) {
    super(message);
    this.name = "IndicatorInputError";
  }
}

/**
 * Stage 1 (ingest + edge-case guard) + Stage 2 (normalize to [0,1]), server-side only.
 * Never trusts a client-submitted normalized value directly (FR-4).
 */
export function computeIndicator(
  input: IndicatorInput,
  pdpSubItemWeights: PdpSubItemWeights
): IndicatorComputed {
  const def = INDICATORS[input.code];
  if (!def) throw new IndicatorInputError(input.code, `Unknown indicator ${input.code}`);

  if (input.mode === "QUICK") {
    const level = input.rubricLevel;
    if (level == null || level < 1 || level > 5) {
      throw new IndicatorInputError(input.code, `${input.code}: rubric level is required (1-5).`);
    }
    return {
      code: input.code,
      dimension: def.dimension,
      mode: "QUICK",
      rawValue: level,
      normalizedValue: normalizeRubricLevel(level),
    };
  }

  // PRECISE mode
  if (def.structured === "PDP") {
    const items = input.subItems ?? {};
    let weightedSum = 0;
    for (const key of PDP_SUB_ITEMS) {
      const score = items[key];
      if (score == null || ![0, 0.5, 1].includes(score)) {
        throw new IndicatorInputError("PDP", `PDP: sub-item "${key}" must be scored 0, 0.5, or 1.`);
      }
      weightedSum += score * pdpSubItemWeights[key];
    }
    return {
      code: "PDP",
      dimension: def.dimension,
      mode: "PRECISE",
      rawValue: weightedSum,
      normalizedValue: clamp(weightedSum),
    };
  }

  if (def.structured === "XAI") {
    const items = input.subItems ?? {};
    let metCount = 0;
    for (const key of XAI_CONDITIONS) {
      const v = items[key];
      if (v == null) {
        throw new IndicatorInputError("XAI", `XAI: condition "${key}" must be answered.`);
      }
      if (v >= 1) metCount += 1;
    }
    const proportion = metCount / XAI_CONDITIONS.length;
    return {
      code: "XAI",
      dimension: def.dimension,
      mode: "PRECISE",
      rawValue: proportion,
      normalizedValue: clamp(proportion),
    };
  }

  const raw = input.rawValues ?? {};
  const need = (key: string) => {
    const v = raw[key];
    if (v == null || Number.isNaN(v)) {
      throw new IndicatorInputError(input.code, `${input.code}: field "${key}" is required.`);
    }
    return v;
  };

  switch (input.code) {
    case "SPI": {
      const ev = need("ev");
      const pv = need("pv");
      if (pv === 0) throw new IndicatorInputError("SPI", "SPI: Planned Value (PV) cannot be zero.");
      const value = ev / pv;
      return { code: "SPI", dimension: def.dimension, mode: "PRECISE", rawValue: value, normalizedValue: normalizeDistanceToTarget(value, 1) };
    }
    case "CPI": {
      const ev = need("ev");
      const ac = need("ac");
      if (ac === 0) throw new IndicatorInputError("CPI", "CPI: Actual Cost (AC) cannot be zero — no cost has been incurred yet.");
      const value = ev / ac;
      return { code: "CPI", dimension: def.dimension, mode: "PRECISE", rawValue: value, normalizedValue: normalizeDistanceToTarget(value, 1) };
    }
    case "SC": {
      const baseline = need("baselineItems");
      const changed = need("changedItems");
      if (baseline === 0) throw new IndicatorInputError("SC", "SC: baseline scope items cannot be zero.");
      const value = 1 - changed / baseline;
      return { code: "SC", dimension: def.dimension, mode: "PRECISE", rawValue: value, normalizedValue: clamp(value) };
    }
    case "VS": {
      const planned = need("plannedVelocity");
      const actual = need("actualVelocity");
      if (planned === 0) throw new IndicatorInputError("VS", "VS: planned velocity cannot be zero.");
      const value = actual / planned;
      return { code: "VS", dimension: def.dimension, mode: "PRECISE", rawValue: value, normalizedValue: normalizeDistanceToTarget(value, 1) };
    }
    case "CR": {
      const avg = need("avgResponseDays");
      const target = need("targetResponseDays");
      if (avg === 0) throw new IndicatorInputError("CR", "CR: average response time cannot be zero.");
      const value = target / avg;
      return { code: "CR", dimension: def.dimension, mode: "PRECISE", rawValue: value, normalizedValue: clamp(value) };
    }
    case "FIR": {
      const incorporated = need("incorporated");
      const received = need("received");
      if (received === 0) throw new IndicatorInputError("FIR", "FIR: feedback items received cannot be zero.");
      const value = incorporated / received;
      return { code: "FIR", dimension: def.dimension, mode: "PRECISE", rawValue: value, normalizedValue: clamp(value) };
    }
    case "ACC": {
      const rmse = need("rmse");
      const tolerance = need("tolerance");
      if (tolerance === 0) throw new IndicatorInputError("ACC", "ACC: tolerance (T) cannot be zero.");
      const value = rmse / tolerance;
      return { code: "ACC", dimension: def.dimension, mode: "PRECISE", rawValue: value, normalizedValue: clamp(1 - value) };
    }
    case "OGC": {
      const implemented = need("implemented");
      const required = need("required");
      if (required === 0) throw new IndicatorInputError("OGC", "OGC: required standards count cannot be zero.");
      const value = implemented / required;
      return { code: "OGC", dimension: def.dimension, mode: "PRECISE", rawValue: value, normalizedValue: clamp(value) };
    }
    default:
      throw new IndicatorInputError(input.code, `${input.code}: precise mode not supported.`);
  }
}

/** Stage 3: weighted mean of a dimension's normalized indicators (FR-9). */
export function aggregateDimension(
  dimension: DimensionCode,
  computed: IndicatorComputed[],
  indicatorWeights: IndicatorWeights
): number {
  const codes = DIMENSION_META[dimension].indicators;
  let sum = 0;
  for (const code of codes) {
    const item = computed.find((c) => c.code === code);
    if (!item) throw new IndicatorInputError(code, `Missing computed value for ${code}.`);
    sum += item.normalizedValue * indicatorWeights[code];
  }
  return sum;
}

/** FR-11: five-class band boundaries. */
export function classifyBand(sppi: number): ClassificationBand {
  if (sppi <= 0.2) return "VERY_LOW";
  if (sppi <= 0.4) return "LOW";
  if (sppi <= 0.6) return "MODERATE";
  if (sppi <= 0.8) return "HIGH";
  return "VERY_HIGH";
}

/** FR-13: configurable band -> recommended action lookup (not a hard-coded conditional). */
export const RECOMMENDED_ACTION_LOOKUP: Record<ClassificationBand, string> = {
  VERY_LOW: "Escalate",
  LOW: "Correct",
  MODERATE: "Improve",
  HIGH: "Monitor",
  VERY_HIGH: "Sustain",
};

export function recommendedAction(band: ClassificationBand): string {
  return RECOMMENDED_ACTION_LOOKUP[band];
}

/** FR-12: single weakest indicator across all 10, independent of dimension. */
export function weakestIndicator(computed: IndicatorComputed[]): IndicatorCode {
  let weakest = computed[0];
  for (const c of computed) {
    if (c.normalizedValue < weakest.normalizedValue) weakest = c;
  }
  return weakest.code;
}

/**
 * FR-18 (Could): lightweight Monte Carlo sensitivity interval. Perturbs each
 * normalized indicator score with small Gaussian-like noise (via a
 * deterministic seeded PRNG for reproducibility) and reports the 5th/95th
 * percentile of the resulting composite score.
 */
export function monteCarloSensitivity(
  computed: IndicatorComputed[],
  indicatorWeights: IndicatorWeights,
  dimensionWeights: DimensionWeights,
  opts: { iterations?: number; noiseSd?: number; seed?: number } = {}
): { low: number; high: number } {
  const iterations = opts.iterations ?? 500;
  const noiseSd = opts.noiseSd ?? 0.03;
  let seed = opts.seed ?? 42;
  const rand = () => {
    // xorshift32, deterministic
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    seed |= 0;
    return ((seed >>> 0) % 100000) / 100000;
  };
  const gaussian = () => {
    const u1 = Math.max(rand(), 1e-9);
    const u2 = rand();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };

  const samples: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const perturbed = computed.map((c) => ({
      ...c,
      normalizedValue: clamp(c.normalizedValue + gaussian() * noiseSd),
    }));
    const dM = aggregateDimension("MANAGERIAL", perturbed, indicatorWeights);
    const dK = aggregateDimension("AGILITY", perturbed, indicatorWeights);
    const dS = aggregateDimension("SPATIAL_GOVERNANCE", perturbed, indicatorWeights);
    samples.push(dimensionWeights.m * dM + dimensionWeights.k * dK + dimensionWeights.s * dS);
  }
  samples.sort((a, b) => a - b);
  const low = samples[Math.floor(0.05 * samples.length)];
  const high = samples[Math.min(samples.length - 1, Math.ceil(0.95 * samples.length))];
  return { low: clamp(low), high: clamp(high) };
}

export interface ComputeSPPIParams {
  inputs: IndicatorInput[];
  indicatorWeights: IndicatorWeights;
  dimensionWeights: DimensionWeights;
  pdpSubItemWeights: PdpSubItemWeights;
}

/** Stage 4: aggregate, classify, and produce the full SPPI computation result. */
export function computeSPPI(params: ComputeSPPIParams): SPPIComputationResult {
  const { inputs, indicatorWeights, dimensionWeights, pdpSubItemWeights } = params;

  if (inputs.length !== 10) {
    throw new IndicatorInputError(
      inputs[0]?.code ?? "SPI",
      `All 10 indicators must have a value before calculation (got ${inputs.length}).`
    );
  }

  const computed = inputs.map((input) => computeIndicator(input, pdpSubItemWeights));

  const dScoreM = aggregateDimension("MANAGERIAL", computed, indicatorWeights);
  const dScoreK = aggregateDimension("AGILITY", computed, indicatorWeights);
  const dScoreS = aggregateDimension("SPATIAL_GOVERNANCE", computed, indicatorWeights);

  const sppiScore = dimensionWeights.m * dScoreM + dimensionWeights.k * dScoreK + dimensionWeights.s * dScoreS;
  const classificationBand = classifyBand(sppiScore);
  const weakest = weakestIndicator(computed);
  const action = recommendedAction(classificationBand);
  const { low, high } = monteCarloSensitivity(computed, indicatorWeights, dimensionWeights);

  return {
    indicators: computed,
    dScoreM,
    dScoreK,
    dScoreS,
    sppiScore,
    classificationBand,
    weakestIndicator: weakest,
    recommendedAction: action,
    sensitivityLow: low,
    sensitivityHigh: high,
  };
}
