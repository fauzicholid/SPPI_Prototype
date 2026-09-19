import { prisma } from "@/lib/prisma";
import { visibleProjectIdsFor, type SessionUser } from "@/lib/authz";

export interface PortfolioFilters {
  region?: string | null;
  band?: string | null;
  from?: string | null;
  to?: string | null;
}

export interface PortfolioRow {
  projectId: string;
  projectName: string;
  region: string;
  latestSppi: number | null;
  band: string | null;
  trend: "up" | "down" | "flat" | null;
  weakestIndicator: string | null;
  recommendedAction: string | null;
  lastAssessedAt: string | null;
  cycleLabel: string | null;
}

const DIMENSION_OF: Record<string, string> = {
  SPI: "MANAGERIAL",
  CPI: "MANAGERIAL",
  SC: "MANAGERIAL",
  VS: "AGILITY",
  CR: "AGILITY",
  FIR: "AGILITY",
  ACC: "SPATIAL_GOVERNANCE",
  XAI: "SPATIAL_GOVERNANCE",
  PDP: "SPATIAL_GOVERNANCE",
  OGC: "SPATIAL_GOVERNANCE",
};

/** FR-19..FR-22: shared portfolio recap query used by both the dashboard page and its API. */
export async function getPortfolioData(user: SessionUser, filters: PortfolioFilters) {
  const visible = await visibleProjectIdsFor(user);
  const where = visible === "ALL" ? {} : { id: { in: visible } };

  const projects = await prisma.project.findMany({
    where: { ...where, ...(filters.region ? { region: filters.region } : {}) },
    include: {
      assessments: {
        where: { status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
        include: { result: true },
      },
    },
  });

  const rows: PortfolioRow[] = [];
  const cycleBuckets = new Map<string, number[]>();

  for (const project of projects) {
    const completed = project.assessments.filter((a) => a.result);
    const inRange = completed.filter((a) => {
      if (filters.from && a.createdAt < new Date(filters.from)) return false;
      if (filters.to && a.createdAt > new Date(filters.to)) return false;
      return true;
    });
    const latest = inRange[0];
    const prior = inRange[1];

    if (filters.band && latest?.result?.classificationBand !== filters.band) continue;

    let trend: PortfolioRow["trend"] = null;
    if (latest?.result && prior?.result) {
      const diff = latest.result.sppiScore - prior.result.sppiScore;
      trend = Math.abs(diff) < 0.005 ? "flat" : diff > 0 ? "up" : "down";
    }

    rows.push({
      projectId: project.id,
      projectName: project.name,
      region: project.region,
      latestSppi: latest?.result?.sppiScore ?? null,
      band: latest?.result?.classificationBand ?? null,
      trend,
      weakestIndicator: latest?.result?.weakestIndicator ?? null,
      recommendedAction: latest?.result?.recommendedAction ?? null,
      lastAssessedAt: latest?.createdAt.toISOString() ?? null,
      cycleLabel: latest?.cycleLabel ?? null,
    });

    if (completed.length > 1) {
      for (const a of completed) {
        if (!a.result) continue;
        const bucket = cycleBuckets.get(a.cycleLabel) ?? [];
        bucket.push(a.result.sppiScore);
        cycleBuckets.set(a.cycleLabel, bucket);
      }
    }
  }

  const trendSeries = Array.from(cycleBuckets.entries())
    .map(([cycleLabel, scores]) => ({ cycleLabel, avgSppi: scores.reduce((a, b) => a + b, 0) / scores.length }))
    .sort((a, b) => a.cycleLabel.localeCompare(b.cycleLabel));

  const withScore = rows.filter((r) => r.latestSppi != null);
  const avgSppi = withScore.length ? withScore.reduce((a, r) => a + (r.latestSppi ?? 0), 0) / withScore.length : null;

  const bandCounts: Record<string, number> = {};
  for (const r of withScore) if (r.band) bandCounts[r.band] = (bandCounts[r.band] ?? 0) + 1;

  const weakestDimensionCounts: Record<string, number> = { MANAGERIAL: 0, AGILITY: 0, SPATIAL_GOVERNANCE: 0 };
  for (const r of withScore) {
    if (r.weakestIndicator) {
      const dim = DIMENSION_OF[r.weakestIndicator];
      if (dim) weakestDimensionCounts[dim] += 1;
    }
  }

  return {
    rows,
    summary: { avgSppi, totalProjects: rows.length, bandCounts, weakestDimensionCounts },
    trendSeries,
  };
}
