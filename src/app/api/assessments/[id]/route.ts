import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError, ApiError } from "@/lib/api";
import { canEditAssessmentForProject, canViewProjectDashboard } from "@/lib/authz";
import { updateAssessmentSchema } from "@/lib/sppi/schema";
import { upsertIndicatorScore } from "@/lib/sppi/persist";
import type { IndicatorInput } from "@/lib/sppi/types";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const assessment = await prisma.assessment.findUnique({
      where: { id: params.id },
      include: {
        indicatorScores: { include: { subItems: true } },
        result: true,
        weightConfig: true,
        project: { select: { id: true, name: true, region: true } },
        assessor: { select: { name: true } },
      },
    });
    if (!assessment) throw new ApiError(404, "Assessment not found.");

    const allowed = await canViewProjectDashboard(user, assessment.projectId);
    if (!allowed) throw new ApiError(403, "You do not have access to this assessment.");

    return NextResponse.json({ assessment });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const assessment = await prisma.assessment.findUnique({
      where: { id: params.id },
      include: { weightConfig: true },
    });
    if (!assessment) throw new ApiError(404, "Assessment not found.");

    // Revising an indicator after the first calculation is intentional
    // (Section 5: "what if I improve XAI documentation" exploration).
    // The composite result is only current after /calculate is re-run.
    const allowed = await canEditAssessmentForProject(user, assessment.projectId);
    if (!allowed) throw new ApiError(403, "You cannot edit this assessment.");

    const body = updateAssessmentSchema.parse(await req.json());

    const results = [];
    for (const entry of body.indicators) {
      const input: IndicatorInput = {
        code: entry.code,
        mode: entry.mode,
        rubricLevel: "rubricLevel" in entry ? entry.rubricLevel : undefined,
        rawValues: "rawValues" in entry ? entry.rawValues : undefined,
        subItems: "subItems" in entry ? entry.subItems : undefined,
      };
      const computed = await upsertIndicatorScore(assessment.id, input, assessment.weightConfig, entry.justificationNote);
      results.push(computed);
    }

    const updated = await prisma.assessment.findUnique({
      where: { id: params.id },
      include: { indicatorScores: { include: { subItems: true } } },
    });

    return NextResponse.json({ indicatorScores: updated?.indicatorScores, computed: results });
  } catch (err) {
    return handleApiError(err);
  }
}
