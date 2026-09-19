import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError, ApiError } from "@/lib/api";
import { canManageUsers } from "@/lib/authz";
import { createUserSchema } from "@/lib/sppi/schema";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    const user = await requireUser();
    if (!canManageUsers(user.role)) throw new ApiError(403, "Only an Admin may manage user accounts.");
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return NextResponse.json({ users });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!canManageUsers(user.role)) throw new ApiError(403, "Only an Admin may manage user accounts.");
    const body = createUserSchema.parse(await req.json());

    const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (existing) throw new ApiError(409, "A user with this email already exists.");

    const passwordHash = await bcrypt.hash(body.password, 10);
    const created = await prisma.user.create({
      data: { name: body.name, email: body.email.toLowerCase(), passwordHash, role: body.role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    await logAudit({ actorId: user.id, action: "USER_CREATED", targetType: "User", targetId: created.id, metadata: { role: created.role } });

    return NextResponse.json({ user: created }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
