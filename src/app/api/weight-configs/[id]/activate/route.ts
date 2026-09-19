import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError, ApiError } from "@/lib/api";
import { canManageWeightConfig } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

/** FR-24: mark exactly one WeightConfig as active at a time. */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    if (!canManageWeightConfig(user.role)) throw new ApiError(403, "Only a Researcher or Admin may activate a WeightConfig.");

    const config = await prisma.$transaction(async (tx) => {
      await tx.weightConfig.updateMany({ where: { active: true }, data: { active: false } });
      return tx.weightConfig.update({ where: { id: params.id }, data: { active: true } });
    });

    await logAudit({ actorId: user.id, action: "WEIGHT_CONFIG_ACTIVATED", targetType: "WeightConfig", targetId: config.id });

    return NextResponse.json({ config });
  } catch (err) {
    return handleApiError(err);
  }
}
