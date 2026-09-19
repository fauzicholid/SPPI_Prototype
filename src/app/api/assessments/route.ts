import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError, ApiError } from "@/lib/api";
import { canEditAssessmentForProject } from "@/lib/authz";
import { createAssessmentSchema } from "@/lib/sppi/schema";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = createAssessmentSchema.parse(await req.json());

    const allowed = await canEditAssessmentForProject(user, body.projectId);
    if (!allowed) throw new ApiError(403, "You cannot create an assessment for this project.");

    const weightConfig = body.weightConfigId
      ? await prisma.weightConfig.findUnique({ where: { id: body.weightConfigId } })
      : await prisma.weightConfig.findFirst({ where: { active: true } });
    if (!weightConfig) throw new ApiError(400, "No active WeightConfig is available.");

    const assessment = await prisma.assessment.create({
      data: {
        projectId: body.projectId,
        assessorId: user.id,
        weightConfigId: weightConfig.id,
        cycleLabel: body.cycleLabel,
        status: "DRAFT",
      },
    });

    await logAudit({ actorId: user.id, action: "ASSESSMENT_CREATED", targetType: "Assessment", targetId: assessment.id, metadata: { projectId: body.projectId } });

    return NextResponse.json({ assessment }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
