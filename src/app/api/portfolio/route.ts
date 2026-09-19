import { NextRequest, NextResponse } from "next/server";
import { requireUser, handleApiError, ApiError } from "@/lib/api";
import { canViewPortfolio } from "@/lib/authz";
import { getPortfolioData } from "@/lib/sppi/portfolio";

/**
 * FR-19..FR-23: portfolio recap across every project the viewer has access
 * to. Restricted server-side to roles granted portfolio-level view access —
 * a Project Manager without that grant is rejected outright (FR-23).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!canViewPortfolio(user.role)) {
      throw new ApiError(403, "You do not have portfolio-level view access.");
    }

    const { searchParams } = new URL(req.url);
    const data = await getPortfolioData(user, {
      region: searchParams.get("region"),
      band: searchParams.get("band"),
      from: searchParams.get("from"),
      to: searchParams.get("to"),
    });

    return NextResponse.json({ ...data, readOnly: user.role === "VIEWER" });
  } catch (err) {
    return handleApiError(err);
  }
}
