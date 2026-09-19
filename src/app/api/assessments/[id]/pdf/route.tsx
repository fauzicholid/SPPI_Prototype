import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError, ApiError } from "@/lib/api";
import { canExportPdf } from "@/lib/authz";
import { ResultDocument } from "@/lib/pdf/ResultDocument";

export const runtime = "nodejs";

/** FR-17: export the current result — score, breakdown, weakest indicator, weight config — as PDF. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const assessment = await prisma.assessment.findUnique({
      where: { id: params.id },
      include: {
        result: true,
        indicatorScores: true,
        project: true,
        assessor: { select: { name: true } },
        weightConfig: true,
      },
    });
    if (!assessment) throw new ApiError(404, "Assessment not found.");
    if (!assessment.result) throw new ApiError(422, "This assessment has not been calculated yet.");

    const allowed = await canExportPdf(user, assessment.projectId);
    if (!allowed) throw new ApiError(403, "You cannot export this project's result.");

    const buffer = await renderToBuffer(
      <ResultDocument
        projectName={assessment.project.name}
        region={assessment.project.region}
        cycleLabel={assessment.cycleLabel}
        assessorName={assessment.assessor.name}
        computedAt={assessment.result.computedAt.toISOString()}
        weightConfigName={assessment.weightConfig.name}
        dScoreM={assessment.result.dScoreM}
        dScoreK={assessment.result.dScoreK}
        dScoreS={assessment.result.dScoreS}
        sppiScore={assessment.result.sppiScore}
        band={assessment.result.classificationBand}
        weakestIndicator={assessment.result.weakestIndicator}
        recommendedAction={assessment.result.recommendedAction}
        sensitivityLow={assessment.result.sensitivityLow}
        sensitivityHigh={assessment.result.sensitivityHigh}
        indicators={assessment.indicatorScores.map((s) => ({ code: s.indicatorCode, normalizedValue: s.normalizedValue, mode: s.inputMode }))}
      />
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="sppi-${assessment.project.name.replace(/\s+/g, "-")}-${assessment.cycleLabel}.pdf"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
