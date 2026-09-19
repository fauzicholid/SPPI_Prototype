import { prisma } from "@/lib/prisma";

/** FR-28: log every WeightConfig change and every role/permission change. */
export async function logAudit(params: {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      metadata: (params.metadata as object) ?? undefined,
    },
  });
}
