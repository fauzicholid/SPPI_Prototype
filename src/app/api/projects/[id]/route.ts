import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError, ApiError } from "@/lib/api";
import { canViewProjectDashboard } from "@/lib/authz";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const allowed = await canViewProjectDashboard(user, params.id);
    if (!allowed) throw new ApiError(403, "You do not have access to this project.");

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        owner: { select: { id: true, name: true } },
        assignments: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
        assessments: {
          orderBy: { createdAt: "desc" },
          include: { result: true, assessor: { select: { name: true } }, weightConfig: { select: { name: true } } },
        },
      },
    });
    if (!project) throw new ApiError(404, "Project not found.");
    return NextResponse.json({ project });
  } catch (err) {
    return handleApiError(err);
  }
}
