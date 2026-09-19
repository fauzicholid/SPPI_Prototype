import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canViewPortfolio } from "@/lib/authz";
import { getPortfolioData, type PortfolioRow } from "@/lib/sppi/portfolio";
import { prisma } from "@/lib/prisma";
import { BandBadge } from "@/components/BandBadge";
import { PortfolioTrendChart } from "@/components/portfolio/PortfolioTrendChart";
import { INDICATORS } from "@/lib/sppi/indicators";
import type { ClassificationBand, IndicatorCode } from "@/lib/sppi/types";

const BAND_ORDER: ClassificationBand[] = ["VERY_LOW", "LOW", "MODERATE", "HIGH", "VERY_HIGH"];
const DIMENSION_LABEL: Record<string, string> = { MANAGERIAL: "Managerial", AGILITY: "Agility", SPATIAL_GOVERNANCE: "Spatial-Gov." };

type SortKey = "projectName" | "region" | "latestSppi" | "band" | "lastAssessedAt";

function sortRows(rows: PortfolioRow[], sort: SortKey, dir: "asc" | "desc") {
  const sorted = [...rows].sort((a, b) => {
    let av: string | number = a[sort] ?? "";
    let bv: string | number = b[sort] ?? "";
    if (sort === "band") {
      av = a.band ? BAND_ORDER.indexOf(a.band as ClassificationBand) : -1;
      bv = b.band ? BAND_ORDER.indexOf(b.band as ClassificationBand) : -1;
    }
    if (sort === "latestSppi") {
      av = a.latestSppi ?? -1;
      bv = b.latestSppi ?? -1;
    }
    if (av < bv) return dir === "asc" ? -1 : 1;
    if (av > bv) return dir === "asc" ? 1 : -1;
    return 0;
  });
  return sorted;
}

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: { region?: string; band?: string; from?: string; to?: string; sort?: string; dir?: string };
}) {
  const session = await getServerSession(authOptions);
  const user = session!.user;
  if (!canViewPortfolio(user.role)) redirect("/projects");

  const { rows, summary, trendSeries } = await getPortfolioData(user, {
    region: searchParams.region || null,
    band: searchParams.band || null,
    from: searchParams.from || null,
    to: searchParams.to || null,
  });

  const regions = await prisma.project.findMany({ distinct: ["region"], select: { region: true } });

  const sort = (searchParams.sort as SortKey) || "latestSppi";
  const dir = (searchParams.dir as "asc" | "desc") || "desc";
  const sortedRows = sortRows(rows, sort, dir);

  function sortLink(key: SortKey, label: string) {
    const nextDir = sort === key && dir === "desc" ? "asc" : "desc";
    const params = new URLSearchParams({
      ...(searchParams.region ? { region: searchParams.region } : {}),
      ...(searchParams.band ? { band: searchParams.band } : {}),
      ...(searchParams.from ? { from: searchParams.from } : {}),
      ...(searchParams.to ? { to: searchParams.to } : {}),
      sort: key,
      dir: nextDir,
    });
    return (
      <Link href={`/portfolio?${params.toString()}`} className="hover:underline">
        {label} {sort === key ? (dir === "desc" ? "↓" : "↑") : ""}
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Portfolio Dashboard</h1>
        <p className="text-sm text-slate-500">
          {user.role === "VIEWER" ? "Read-only recap across all assessed projects." : "Recap across all assessed projects."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Portfolio avg. SPPI" value={summary.avgSppi != null ? summary.avgSppi.toFixed(2) : "—"} />
        <SummaryCard
          label="Projects flagged (Low / Very Low)"
          value={`${(summary.bandCounts.LOW ?? 0) + (summary.bandCounts.VERY_LOW ?? 0)} of ${summary.totalProjects}`}
        />
        <SummaryCard
          label="Weakest dimension (portfolio)"
          value={
            Object.entries(summary.weakestDimensionCounts).sort((a, b) => b[1] - a[1])[0]
              ? DIMENSION_LABEL[Object.entries(summary.weakestDimensionCounts).sort((a, b) => b[1] - a[1])[0][0]]
              : "—"
          }
        />
      </div>

      <form className="card flex flex-wrap items-end gap-3 p-4 text-sm" method="get">
        <div>
          <label className="mb-1 block text-xs text-slate-500">Region</label>
          <select name="region" defaultValue={searchParams.region ?? ""} className="rounded border border-slate-300 px-2 py-1">
            <option value="">All</option>
            {regions.map((r) => (
              <option key={r.region} value={r.region}>
                {r.region}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Band</label>
          <select name="band" defaultValue={searchParams.band ?? ""} className="rounded border border-slate-300 px-2 py-1">
            <option value="">All</option>
            {BAND_ORDER.map((b) => (
              <option key={b} value={b}>
                {b.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">From</label>
          <input type="date" name="from" defaultValue={searchParams.from ?? ""} className="rounded border border-slate-300 px-2 py-1" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">To</label>
          <input type="date" name="to" defaultValue={searchParams.to ?? ""} className="rounded border border-slate-300 px-2 py-1" />
        </div>
        <button type="submit" className="rounded bg-slate-900 px-4 py-1.5 font-semibold text-white">
          Apply
        </button>
        <Link href="/portfolio" className="text-slate-500 hover:underline">
          Reset
        </Link>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">{sortLink("projectName", "Project")}</th>
              <th className="px-4 py-2">{sortLink("region", "Region")}</th>
              <th className="px-4 py-2">{sortLink("latestSppi", "SPPI")}</th>
              <th className="px-4 py-2">{sortLink("band", "Band")}</th>
              <th className="px-4 py-2">Trend</th>
              <th className="px-4 py-2">Weakest indicator</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">{sortLink("lastAssessedAt", "Last assessed")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedRows.map((r) => (
              <tr key={r.projectId} className="hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link href={`/projects/${r.projectId}`} className="font-medium text-sky-700 hover:underline">
                    {r.projectName}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-600">{r.region}</td>
                <td className="px-4 py-2 font-semibold text-slate-900">{r.latestSppi != null ? r.latestSppi.toFixed(2) : "—"}</td>
                <td className="px-4 py-2">{r.band ? <BandBadge band={r.band as ClassificationBand} /> : "—"}</td>
                <td className="px-4 py-2">{r.trend === "up" ? "↑" : r.trend === "down" ? "↓" : r.trend === "flat" ? "→" : "—"}</td>
                <td className="px-4 py-2 text-slate-600">
                  {r.weakestIndicator ? `${INDICATORS[r.weakestIndicator as IndicatorCode].nameEn} (${r.weakestIndicator})` : "—"}
                </td>
                <td className="px-4 py-2 text-slate-600">{r.recommendedAction ?? "—"}</td>
                <td className="px-4 py-2 text-slate-500">{r.lastAssessedAt ? new Date(r.lastAssessedAt).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
            {sortedRows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                  No projects match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Portfolio trend across assessment cycles</h2>
        {trendSeries.length > 0 ? (
          <PortfolioTrendChart data={trendSeries} />
        ) : (
          <p className="text-sm text-slate-500">No project has more than one recorded assessment yet.</p>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4 text-center">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
