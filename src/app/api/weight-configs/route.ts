import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError, ApiError } from "@/lib/api";
import { canManageWeightConfig } from "@/lib/authz";
import { createWeightConfigSchema } from "@/lib/sppi/schema";
import { validateDimensionWeights, validateIndicatorWeights, validatePdpSubItemWeights } from "@/lib/sppi/weights";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    await requireUser();
    const configs = await prisma.weightConfig.findMany({
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { name: true } } },
    });
    return NextResponse.json({ configs });
  } catch (err) {
    return handleApiError(err);
  }
}

/** FR-24, FR-10: create a WeightConfig; weights that don't sum to 1 (±0.001) are rejected. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!canManageWeightConfig(user.role)) throw new ApiError(403, "Only a Researcher or Admin may create a WeightConfig.");

    const body = createWeightConfigSchema.parse(await req.json());

    const errors = [
      validateDimensionWeights(body.dimensionWeights),
      validateIndicatorWeights(body.indicatorWeights),
      validatePdpSubItemWeights(body.pdpSubItemWeights),
    ].filter((e): e is string => e != null);
    if (errors.length > 0) throw new ApiError(422, errors.join(" "));

    const config = await prisma.$transaction(async (tx) => {
      if (body.activate) {
        await tx.weightConfig.updateMany({ where: { active: true }, data: { active: false } });
      }
      return tx.weightConfig.create({
        data: {
          name: body.name,
          source: body.source,
          dimensionWeights: body.dimensionWeights,
          indicatorWeights: body.indicatorWeights,
          pdpSubItemWeights: body.pdpSubItemWeights,
          active: Boolean(body.activate),
          createdById: user.id,
        },
      });
    });

    await logAudit({ actorId: user.id, action: "WEIGHT_CONFIG_CREATED", targetType: "WeightConfig", targetId: config.id, metadata: { name: config.name, active: config.active } });

    return NextResponse.json({ config }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
