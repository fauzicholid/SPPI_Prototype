import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError, ApiError } from "@/lib/api";
import { getProjectAccess } from "@/lib/authz";
import { assignmentSchema } from "@/lib/sppi/schema";
import { logAudit } from "@/lib/audit";

/** Assigning a Project Manager as owner/assessor scopes their write access (Section 3.62). */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const canManage =
      user.role === "ADMIN" ||
      user.role === "PMO_PORTFOLIO" ||
      user.role === "RESEARCHER" ||
      (await getProjectAccess(user.id, params.id)).isOwnerOrAssessor;
    if (!canManage) throw new ApiError(403, "You cannot manage assignments for this project.");

    const body = assignmentSchema.parse(await req.json());
    const assignment = await prisma.projectAssignment.upsert({
      where: { projectId_userId: { projectId: params.id, userId: body.userId } },
      create: { projectId: params.id, userId: body.userId, role: body.role },
      update: { role: body.role },
    });

    await logAudit({
      actorId: user.id,
      action: "PROJECT_ASSIGNMENT_SET",
      targetType: "Project",
      targetId: params.id,
      metadata: { userId: body.userId, role: body.role },
    });

    return NextResponse.json({ assignment });
  } catch (err) {
    return handleApiError(err);
  }
}
