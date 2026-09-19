import { Prisma, type WeightConfig } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeIndicator } from "./engine";
import { weightConfigToParams } from "./assessment-io";
import { INDICATORS } from "./indicators";
import type { IndicatorInput } from "./types";

/**
 * Computes and upserts a single indicator's score (and, for PDP/XAI, its
 * sub-item rows) for an assessment. The normalized value is always computed
 * server-side (FR-4) — the client only ever sends rubric levels, raw
 * formula inputs, or sub-item answers, never a normalized score.
 */
export async function upsertIndicatorScore(
  assessmentId: string,
  input: IndicatorInput,
  weightConfig: WeightConfig,
  justificationNote?: string | null
) {
  const { pdpSubItemWeights } = weightConfigToParams(weightConfig);
  const computed = computeIndicator(input, pdpSubItemWeights);
  const def = INDICATORS[input.code];

  const score = await prisma.indicatorScore.upsert({
    where: { assessmentId_indicatorCode: { assessmentId, indicatorCode: input.code } },
    create: {
      assessmentId,
      indicatorCode: input.code,
      dimension: def.dimension,
      inputMode: input.mode,
      rubricLevel: input.mode === "QUICK" ? input.rubricLevel ?? null : null,
      rawValues: input.mode === "PRECISE" && !def.structured ? (input.rawValues as object) : undefined,
      normalizedValue: computed.normalizedValue,
      justificationNote: justificationNote ?? null,
    },
    update: {
      inputMode: input.mode,
      rubricLevel: input.mode === "QUICK" ? input.rubricLevel ?? null : null,
      rawValues: input.mode === "PRECISE" && !def.structured ? (input.rawValues as object) : Prisma.JsonNull,
      normalizedValue: computed.normalizedValue,
      justificationNote: justificationNote ?? null,
    },
  });

  if (def.structured && input.subItems) {
    await Promise.all(
      Object.entries(input.subItems).map(([itemCode, value]) =>
        prisma.subItemScore.upsert({
          where: { indicatorScoreId_itemCode: { indicatorScoreId: score.id, itemCode } },
          create: { indicatorScoreId: score.id, itemCode, score: value },
          update: { score: value },
        })
      )
    );
  }

  return computed;
}
