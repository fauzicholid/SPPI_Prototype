import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEditAssessmentForProject, canViewProjectDashboard } from "@/lib/authz";
import { BandBadge } from "@/components/BandBadge";
import { NewAssessmentButton } from "@/components/NewAssessmentButton";
import type { ClassificationBand } from "@/lib/sppi/types";

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session!.user;

  const allowed = await canViewProjectDashboard(user, params.id);
  if (!allowed) redirect("/projects");

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      owner: { select: { name: true } },
      assessments: {
        orderBy: { createdAt: "desc" },
        include: { result: true, assessor: { select: { name: true } } },
      },
    },
  });
  if (!project) notFound();

  const canEdit = await canEditAssessmentForProject(user, params.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{project.name}</h1>
          <p className="text-sm text-slate-500">
            {project.region} · Owner: {project.owner.name}
          </p>
        </div>
        {canEdit && <NewAssessmentButton projectId={project.id} />}
      </div>

      <div className="card divide-y divide-slate-100">
        <div className="p-4 text-sm font-semibold text-slate-700">Assessment history</div>
        {project.assessments.length === 0 && <p className="p-6 text-sm text-slate-500">No assessments yet.</p>}
        {project.assessments.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="font-medium text-slate-900">Cycle {a.cycleLabel}</p>
              <p className="text-sm text-slate-500">
                {a.assessor.name} · {a.status === "COMPLETED" ? "Completed" : "Draft"} ·{" "}
                {new Date(a.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {a.result && (
                <>
                  <span className="text-lg font-bold text-slate-900">{a.result.sppiScore.toFixed(2)}</span>
                  <BandBadge band={a.result.classificationBand as ClassificationBand} />
                </>
              )}
              {a.status === "COMPLETED" ? (
                <Link href={`/projects/${project.id}/results/${a.id}`} className="text-sm font-medium text-sky-700 hover:underline">
                  View result
                </Link>
              ) : canEdit ? (
                <Link href={`/projects/${project.id}/assess/${a.id}`} className="text-sm font-medium text-sky-700 hover:underline">
                  Continue draft
                </Link>
              ) : (
                <span className="text-sm text-slate-400">Draft</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
