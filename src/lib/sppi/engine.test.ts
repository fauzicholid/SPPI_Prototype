import { describe, expect, it } from "vitest";
import {
  classifyBand,
  computeIndicator,
  computeSPPI,
  normalizeRubricLevel,
  recommendedAction,
  weakestIndicator,
} from "./engine";
import { DEFAULT_DIMENSION_WEIGHTS, DEFAULT_INDICATOR_WEIGHTS, DEFAULT_PDP_SUB_ITEM_WEIGHTS, validateDimensionWeights, validateIndicatorWeights, validatePdpSubItemWeights } from "./weights";
import type { IndicatorInput } from "./types";

describe("normalizeRubricLevel (FR-3)", () => {
  it("maps level 1..5 linearly to 0.00..1.00", () => {
    expect(normalizeRubricLevel(1)).toBe(0);
    expect(normalizeRubricLevel(2)).toBeCloseTo(0.25);
    expect(normalizeRubricLevel(3)).toBeCloseTo(0.5);
    expect(normalizeRubricLevel(4)).toBeCloseTo(0.75);
    expect(normalizeRubricLevel(5)).toBe(1);
  });
});

describe("computeIndicator precise-mode formulas (FR-4)", () => {
  it("computes SPI = EV/PV, normalized by distance-to-target", () => {
    const result = computeIndicator(
      { code: "SPI", mode: "PRECISE", rawValues: { ev: 90, pv: 100 } },
      DEFAULT_PDP_SUB_ITEM_WEIGHTS
    );
    expect(result.rawValue).toBeCloseTo(0.9);
    expect(result.normalizedValue).toBeCloseTo(0.9); // 1 - |0.9-1|
  });

  it("computes ACC from RMSE and tolerance T", () => {
    const result = computeIndicator(
      { code: "ACC", mode: "PRECISE", rawValues: { rmse: 37, tolerance: 100 } },
      DEFAULT_PDP_SUB_ITEM_WEIGHTS
    );
    expect(result.normalizedValue).toBeCloseTo(0.63);
  });

  it("rejects CPI with zero Actual Cost (Stage 1 edge-case guard)", () => {
    expect(() =>
      computeIndicator({ code: "CPI", mode: "PRECISE", rawValues: { ev: 10, ac: 0 } }, DEFAULT_PDP_SUB_ITEM_WEIGHTS)
    ).toThrow();
  });

  it("computes PDP as the severity-weighted mean of 7 sub-items (FR-5)", () => {
    const allHalf = Object.fromEntries(
      ["lawfulBasis", "purposeLimitation", "minimization", "retention", "dpia", "dataSubjectRights", "breachNotification"].map(
        (k) => [k, 0.5]
      )
    );
    const result = computeIndicator({ code: "PDP", mode: "PRECISE", subItems: allHalf }, DEFAULT_PDP_SUB_ITEM_WEIGHTS);
    expect(result.normalizedValue).toBeCloseTo(0.5);
  });

  it("computes XAI as the proportion of decisions meeting all 4 conditions (FR-6)", () => {
    const result = computeIndicator(
      {
        code: "XAI",
        mode: "PRECISE",
        subItems: {
          attributionRecordExists: 1,
          faithfulnessThresholdMet: 1,
          complexityBelowCeiling: 0,
          plainLanguageSummaryAvailable: 0,
        },
      },
      DEFAULT_PDP_SUB_ITEM_WEIGHTS
    );
    expect(result.normalizedValue).toBeCloseTo(0.5);
  });

  it("blocks calculation when a required field is missing (FR-7)", () => {
    expect(() =>
      computeIndicator({ code: "SPI", mode: "PRECISE", rawValues: { ev: 10 } }, DEFAULT_PDP_SUB_ITEM_WEIGHTS)
    ).toThrow();
  });
});

describe("classifyBand (FR-11)", () => {
  it("assigns the five bands at their boundaries", () => {
    expect(classifyBand(0.2)).toBe("VERY_LOW");
    expect(classifyBand(0.2001)).toBe("LOW");
    expect(classifyBand(0.4)).toBe("LOW");
    expect(classifyBand(0.4001)).toBe("MODERATE");
    expect(classifyBand(0.6)).toBe("MODERATE");
    expect(classifyBand(0.6001)).toBe("HIGH");
    expect(classifyBand(0.8)).toBe("HIGH");
    expect(classifyBand(0.8001)).toBe("VERY_HIGH");
  });
});

describe("recommendedAction (FR-13)", () => {
  it("maps each band to its action via the lookup table", () => {
    expect(recommendedAction("VERY_LOW")).toBe("Escalate");
    expect(recommendedAction("LOW")).toBe("Correct");
    expect(recommendedAction("MODERATE")).toBe("Improve");
    expect(recommendedAction("HIGH")).toBe("Monitor");
    expect(recommendedAction("VERY_HIGH")).toBe("Sustain");
  });
});

describe("weight configuration validation (FR-10, FR-24)", () => {
  it("accepts the default provisional weights", () => {
    expect(validateDimensionWeights(DEFAULT_DIMENSION_WEIGHTS)).toBeNull();
    expect(validateIndicatorWeights(DEFAULT_INDICATOR_WEIGHTS)).toBeNull();
    expect(validatePdpSubItemWeights(DEFAULT_PDP_SUB_ITEM_WEIGHTS)).toBeNull();
  });

  it("rejects dimension weights that do not sum to 1 within tolerance", () => {
    expect(validateDimensionWeights({ m: 0.4, k: 0.4, s: 0.4 })).not.toBeNull();
  });
});

describe("computeSPPI — worked example (NFR Correctness)", () => {
  // Crafted precise-mode inputs whose per-dimension normalized averages
  // reproduce the research manuscript's worked example exactly:
  // D_m = 0.67, D_k = 0.58, D_s = 0.63, SPPI = 0.629 (~0.63).
  const inputs: IndicatorInput[] = [
    { code: "SPI", mode: "PRECISE", rawValues: { ev: 0.67, pv: 1 } },
    { code: "CPI", mode: "PRECISE", rawValues: { ev: 0.67, ac: 1 } },
    { code: "SC", mode: "PRECISE", rawValues: { baselineItems: 100, changedItems: 33 } },
    { code: "VS", mode: "PRECISE", rawValues: { plannedVelocity: 100, actualVelocity: 58 } },
    { code: "CR", mode: "PRECISE", rawValues: { avgResponseDays: 100, targetResponseDays: 58 } },
    { code: "FIR", mode: "PRECISE", rawValues: { received: 100, incorporated: 58 } },
    { code: "ACC", mode: "PRECISE", rawValues: { rmse: 37, tolerance: 100 } },
    {
      code: "XAI",
      mode: "PRECISE",
      subItems: {
        attributionRecordExists: 1,
        faithfulnessThresholdMet: 1,
        complexityBelowCeiling: 0,
        plainLanguageSummaryAvailable: 0,
      },
    },
    {
      code: "PDP",
      mode: "PRECISE",
      subItems: {
        lawfulBasis: 0.5,
        purposeLimitation: 0.5,
        minimization: 0.5,
        retention: 0.5,
        dpia: 0.5,
        dataSubjectRights: 0.5,
        breachNotification: 0.5,
      },
    },
    { code: "OGC", mode: "PRECISE", rawValues: { implemented: 89, required: 100 } },
  ];

  const result = computeSPPI({
    inputs,
    indicatorWeights: DEFAULT_INDICATOR_WEIGHTS,
    dimensionWeights: DEFAULT_DIMENSION_WEIGHTS,
    pdpSubItemWeights: DEFAULT_PDP_SUB_ITEM_WEIGHTS,
  });

  it("reproduces the dimension sub-scores exactly", () => {
    expect(result.dScoreM).toBeCloseTo(0.67, 6);
    expect(result.dScoreK).toBeCloseTo(0.58, 6);
    expect(result.dScoreS).toBeCloseTo(0.63, 6);
  });

  it("reproduces the composite SPPI score", () => {
    expect(result.sppiScore).toBeCloseTo(0.629, 6);
    expect(Math.round(result.sppiScore * 100) / 100).toBe(0.63);
  });

  it("classifies as High with recommended action Monitor, matching the reference wireframe", () => {
    expect(result.classificationBand).toBe("HIGH");
    expect(result.recommendedAction).toBe("Monitor");
  });

  it("is deterministic: recomputing from the same inputs and weights reproduces the same score (Auditability NFR)", () => {
    const again = computeSPPI({
      inputs,
      indicatorWeights: DEFAULT_INDICATOR_WEIGHTS,
      dimensionWeights: DEFAULT_DIMENSION_WEIGHTS,
      pdpSubItemWeights: DEFAULT_PDP_SUB_ITEM_WEIGHTS,
    });
    expect(again.sppiScore).toBe(result.sppiScore);
    expect(again.weakestIndicator).toBe(result.weakestIndicator);
  });

  it("identifies the single lowest-scoring indicator across all 10, independent of dimension (FR-12)", () => {
    expect(result.weakestIndicator).toBe(weakestIndicator(result.indicators));
    // XAI (0.5) and PDP (0.5) tie for lowest; either is an acceptable weakest pick.
    expect(["XAI", "PDP"]).toContain(result.weakestIndicator);
  });

  it("blocks calculation until all 10 indicators have a value (FR-7)", () => {
    expect(() =>
      computeSPPI({
        inputs: inputs.slice(0, 9),
        indicatorWeights: DEFAULT_INDICATOR_WEIGHTS,
        dimensionWeights: DEFAULT_DIMENSION_WEIGHTS,
        pdpSubItemWeights: DEFAULT_PDP_SUB_ITEM_WEIGHTS,
      })
    ).toThrow();
  });
});
