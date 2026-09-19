import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { SessionUser } from "@/lib/authz";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function requireUser(): Promise<SessionUser & { name: string; email: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new ApiError(401, "Not authenticated.");
  return session.user;
}

export function handleApiError(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  const message = err instanceof Error ? err.message : "Unexpected error.";
  return NextResponse.json({ error: message }, { status: 400 });
}
