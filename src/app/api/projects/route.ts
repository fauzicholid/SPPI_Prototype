import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError, ApiError } from "@/lib/api";
import { canCreateProjects, visibleProjectIdsFor } from "@/lib/authz";
import { createProjectSchema } from "@/lib/sppi/schema";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    const user = await requireUser();
    const visible = await visibleProjectIdsFor(user);
    const where = visible === "ALL" ? {} : { id: { in: visible } };
    const projects = await prisma.project.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { owner: { select: { name: true } } },
    });
    return NextResponse.json({ projects });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!canCreateProjects(user.role)) throw new ApiError(403, "You do not have permission to create projects.");
    const body = createProjectSchema.parse(await req.json());

    const project = await prisma.project.create({
      data: {
        name: body.name,
        region: body.region,
        ownerId: user.id,
        assignments: { create: { userId: user.id, role: "OWNER" } },
      },
    });

    await logAudit({ actorId: user.id, action: "PROJECT_CREATED", targetType: "Project", targetId: project.id, metadata: { name: project.name } });

    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
