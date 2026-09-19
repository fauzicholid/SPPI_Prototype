import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError, ApiError } from "@/lib/api";

/** FR-28: audit trail, retained independent of the underlying assessment data. */
export async function GET() {
  try {
    const user = await requireUser();
    if (user.role !== "ADMIN" && user.role !== "RESEARCHER") {
      throw new ApiError(403, "Only an Admin or Researcher may view the audit log.");
    }
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { actor: { select: { name: true, email: true } } },
    });
    return NextResponse.json({ logs });
  } catch (err) {
    return handleApiError(err);
  }
}
