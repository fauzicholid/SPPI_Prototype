import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { visibleProjectIdsFor, canCreateProjects } from "@/lib/authz";
import { BandBadge } from "@/components/BandBadge";
import { NewProjectForm } from "@/components/NewProjectForm";
import type { ClassificationBand } from "@/lib/sppi/types";

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);
  const user = session!.user;

  const visible = await visibleProjectIdsFor(user);
  const where = visible === "ALL" ? {} : { id: { in: visible } };

  const projects = await prisma.project.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      assessments: {
        where: { status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { result: true },
      },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Projects</h1>
          <p className="text-sm text-slate-500">
            {visible === "ALL" ? "All assessed projects." : "Projects you own, assess, or are assigned to view."}
          </p>
        </div>
      </div>

      {canCreateProjects(user.role) && <NewProjectForm />}

      <div className="card divide-y divide-slate-100">
        {projects.length === 0 && <p className="p-6 text-sm text-slate-500">No projects yet.</p>}
        {projects.map((p) => {
          const latest = p.assessments[0];
          return (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50"
            >
              <div>
                <p className="font-semibold text-slate-900">{p.name}</p>
                <p className="text-sm text-slate-500">{p.region}</p>
              </div>
              <div className="flex items-center gap-4">
                {latest?.result ? (
                  <>
                    <span className="text-lg font-bold text-slate-900">{latest.result.sppiScore.toFixed(2)}</span>
                    <BandBadge band={latest.result.classificationBand as ClassificationBand} />
                  </>
                ) : (
                  <span className="text-sm text-slate-400">Not yet assessed</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
