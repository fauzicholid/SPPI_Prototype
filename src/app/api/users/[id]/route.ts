import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError, ApiError } from "@/lib/api";
import { canManageUsers } from "@/lib/authz";
import { updateUserRoleSchema } from "@/lib/sppi/schema";
import { logAudit } from "@/lib/audit";

/** FR-28: every role/permission change is logged with actor identity + timestamp. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    if (!canManageUsers(user.role)) throw new ApiError(403, "Only an Admin may manage user accounts.");

    const body = updateUserRoleSchema.parse(await req.json());
    const before = await prisma.user.findUnique({ where: { id: params.id }, select: { role: true } });
    const updated = await prisma.user.update({
      where: { id: params.id },
      data: { role: body.role },
      select: { id: true, name: true, email: true, role: true },
    });

    await logAudit({
      actorId: user.id,
      action: "USER_ROLE_CHANGED",
      targetType: "User",
      targetId: updated.id,
      metadata: { from: before?.role, to: updated.role },
    });

    return NextResponse.json({ user: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
