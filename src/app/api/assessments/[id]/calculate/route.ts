import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError, ApiError } from "@/lib/api";
import { canEditAssessmentForProject } from "@/lib/authz";
import { computeSPPI, IndicatorInputError } from "@/lib/sppi/engine";
import { indicatorScoresToInputs, weightConfigToParams } from "@/lib/sppi/assessment-io";
import { INDICATOR_CODES } from "@/lib/sppi/indicators";
import { logAudit } from "@/lib/audit";

/**
 * FR-7: blocks calculation until all 10 indicators have a value.
 * FR-9..FR-13: runs the full Stage 3/4 pipeline and persists the SPPIResult.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const assessment = await prisma.assessment.findUnique({
      where: { id: params.id },
      include: { indicatorScores: { include: { subItems: true } }, weightConfig: true },
    });
    if (!assessment) throw new ApiError(404, "Assessment not found.");

    const allowed = await canEditAssessmentForProject(user, assessment.projectId);
    if (!allowed) throw new ApiError(403, "You cannot calculate this assessment.");

    const presentCodes = new Set(assessment.indicatorScores.map((s) => s.indicatorCode));
    const missing = INDICATOR_CODES.filter((c) => !presentCodes.has(c));
    if (missing.length > 0) {
      throw new ApiError(422, `Cannot calculate: the following indicators are still unanswered: ${missing.join(", ")}.`);
    }

    const inputs = indicatorScoresToInputs(assessment.indicatorScores);
    const { indicatorWeights, dimensionWeights, pdpSubItemWeights } = weightConfigToParams(assessment.weightConfig);

    let outcome;
    try {
      outcome = computeSPPI({ inputs, indicatorWeights, dimensionWeights, pdpSubItemWeights });
    } catch (e) {
      if (e instanceof IndicatorInputError) throw new ApiError(422, e.message);
      throw e;
    }

    const result = await prisma.$transaction(async (tx) => {
      const saved = await tx.sPPIResult.upsert({
        where: { assessmentId: assessment.id },
        create: {
          assessmentId: assessment.id,
          weightConfigId: assessment.weightConfigId,
          dScoreM: outcome.dScoreM,
          dScoreK: outcome.dScoreK,
          dScoreS: outcome.dScoreS,
          sppiScore: outcome.sppiScore,
          classificationBand: outcome.classificationBand,
          weakestIndicator: outcome.weakestIndicator,
          recommendedAction: outcome.recommendedAction,
          sensitivityLow: outcome.sensitivityLow,
          sensitivityHigh: outcome.sensitivityHigh,
        },
        update: {
          weightConfigId: assessment.weightConfigId,
          dScoreM: outcome.dScoreM,
          dScoreK: outcome.dScoreK,
          dScoreS: outcome.dScoreS,
          sppiScore: outcome.sppiScore,
          classificationBand: outcome.classificationBand,
          weakestIndicator: outcome.weakestIndicator,
          recommendedAction: outcome.recommendedAction,
          sensitivityLow: outcome.sensitivityLow,
          sensitivityHigh: outcome.sensitivityHigh,
          computedAt: new Date(),
        },
      });
      await tx.assessment.update({ where: { id: assessment.id }, data: { status: "COMPLETED" } });
      return saved;
    });

    await logAudit({
      actorId: user.id,
      action: "ASSESSMENT_CALCULATED",
      targetType: "Assessment",
      targetId: assessment.id,
      metadata: { sppiScore: outcome.sppiScore, band: outcome.classificationBand, weightConfigId: assessment.weightConfigId },
    });

    return NextResponse.json({ result });
  } catch (err) {
    return handleApiError(err);
  }
}
