export type IndicatorCode =
  | "SPI"
  | "CPI"
  | "SC"
  | "VS"
  | "CR"
  | "FIR"
  | "ACC"
  | "XAI"
  | "PDP"
  | "OGC";

export type DimensionCode = "MANAGERIAL" | "AGILITY" | "SPATIAL_GOVERNANCE";

export type InputMode = "QUICK" | "PRECISE";

export type ClassificationBand =
  | "VERY_LOW"
  | "LOW"
  | "MODERATE"
  | "HIGH"
  | "VERY_HIGH";

export interface RubricAnchor {
  level: 1 | 2 | 3 | 4 | 5;
  en: string;
  id: string;
}

export interface PreciseField {
  key: string;
  labelEn: string;
  labelId: string;
  unit?: string;
  min?: number;
}

export interface IndicatorDef {
  code: IndicatorCode;
  dimension: DimensionCode;
  nameEn: string;
  nameId: string;
  quickAnchors: RubricAnchor[];
  preciseFields?: PreciseField[];
  preciseHelpEn?: string;
  preciseHelpId?: string;
  structured?: "PDP" | "XAI";
}

/** The 7 statutory PDP sub-items, per FR-5. */
export const PDP_SUB_ITEMS = [
  "lawfulBasis",
  "purposeLimitation",
  "minimization",
  "retention",
  "dpia",
  "dataSubjectRights",
  "breachNotification",
] as const;
export type PdpSubItemKey = (typeof PDP_SUB_ITEMS)[number];

/** The 4 XAI verification conditions, per FR-6. */
export const XAI_CONDITIONS = [
  "attributionRecordExists",
  "faithfulnessThresholdMet",
  "complexityBelowCeiling",
  "plainLanguageSummaryAvailable",
] as const;
export type XaiConditionKey = (typeof XAI_CONDITIONS)[number];

export interface DimensionWeights {
  m: number;
  k: number;
  s: number;
}

/** Per-indicator weight, keyed by indicator code. Within each dimension the
 * relevant subset must sum to 1 (validated on WeightConfig save). */
export type IndicatorWeights = Record<IndicatorCode, number>;

export type PdpSubItemWeights = Record<PdpSubItemKey, number>;

export interface IndicatorInput {
  code: IndicatorCode;
  mode: InputMode;
  rubricLevel?: number | null;
  rawValues?: Record<string, number> | null;
  subItems?: Record<string, number> | null;
}

export interface IndicatorComputed {
  code: IndicatorCode;
  dimension: DimensionCode;
  mode: InputMode;
  rawValue: number | null;
  normalizedValue: number;
}

export interface SPPIComputationResult {
  indicators: IndicatorComputed[];
  dScoreM: number;
  dScoreK: number;
  dScoreS: number;
  sppiScore: number;
  classificationBand: ClassificationBand;
  weakestIndicator: IndicatorCode;
  recommendedAction: string;
  sensitivityLow: number;
  sensitivityHigh: number;
}
