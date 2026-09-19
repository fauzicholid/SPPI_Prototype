import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEditAssessmentForProject, canExportPdf, canViewProjectDashboard } from "@/lib/authz";
import { BandBadge } from "@/components/BandBadge";
import { IndicatorChart } from "@/components/results/IndicatorChart";
import { INDICATORS } from "@/lib/sppi/indicators";
import type { ClassificationBand, IndicatorCode } from "@/lib/sppi/types";

export default async function ResultsPage({ params }: { params: { id: string; assessmentId: string } }) {
  const session = await getServerSession(authOptions);
  const user = session!.user;

  const allowed = await canViewProjectDashboard(user, params.id);
  if (!allowed) redirect("/projects");

  const assessment = await prisma.assessment.findUnique({
    where: { id: params.assessmentId },
    include: {
      result: true,
      indicatorScores: true,
      project: true,
      assessor: { select: { name: true } },
      weightConfig: true,
    },
  });
  if (!assessment || !assessment.result) notFound();

  const canEdit = await canEditAssessmentForProject(user, params.id);
  const canPdf = await canExportPdf(user, params.id);
  const band = assessment.result.classificationBand as ClassificationBand;
  const weakest = assessment.result.weakestIndicator as IndicatorCode;

  const indicatorData = assessment.indicatorScores.map((s) => ({
    code: s.indicatorCode as IndicatorCode,
    name: INDICATORS[s.indicatorCode as IndicatorCode].nameEn,
    dimension: s.dimension,
    value: s.normalizedValue,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{assessment.project.name}</h1>
          <p className="text-sm text-slate-500">
            Cycle {assessment.cycleLabel} · Assessed by {assessment.assessor.name} · Weight config: {assessment.weightConfig.name}
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Link
              href={`/projects/${params.id}/assess/${assessment.id}`}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Revise indicators
            </Link>
          )}
          {canPdf && (
            <a
              href={`/api/assessments/${assessment.id}/pdf`}
              className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
            >
              Export PDF
            </a>
          )}
        </div>
      </div>

      <div className="card p-6">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-5xl font-bold text-slate-900">{assessment.result.sppiScore.toFixed(2)}</span>
          <BandBadge band={band} action={assessment.result.recommendedAction} />
        </div>
        {assessment.result.sensitivityLow != null && assessment.result.sensitivityHigh != null && (
          <p className="mt-2 text-sm text-slate-500">
            90% sensitivity interval: [{assessment.result.sensitivityLow.toFixed(2)}, {assessment.result.sensitivityHigh.toFixed(2)}]
          </p>
        )}
        <p className="mt-1 text-xs text-amber-600">Provisional thresholds — band boundaries pending Stage 3 field calibration.</p>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Dimension breakdown</h2>
        <div className="flex flex-col gap-3">
          <DimensionBar label="Managerial" value={assessment.result.dScoreM} color="#0ea5e9" />
          <DimensionBar label="Agility" value={assessment.result.dScoreK} color="#22c55e" />
          <DimensionBar label="Spatial Governance" value={assessment.result.dScoreS} color="#f97316" />
        </div>
      </div>

      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Indicator scores</h2>
          <span className="text-xs text-slate-500">
            Weakest indicator:{" "}
            <span className="font-semibold text-red-600">
              {INDICATORS[weakest].nameEn} ({weakest})
            </span>
          </span>
        </div>
        <IndicatorChart data={indicatorData} weakest={weakest} />
      </div>
    </div>
  );
}

function DimensionBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold text-slate-900">{value.toFixed(2)}</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full" style={{ width: `${value * 100}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
