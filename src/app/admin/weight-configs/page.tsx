import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canManageWeightConfig } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { ActivateButton } from "@/components/admin/ActivateButton";

export default async function WeightConfigsPage() {
  const session = await getServerSession(authOptions);
  const user = session!.user;
  if (!canManageWeightConfig(user.role)) redirect("/projects");

  const configs = await prisma.weightConfig.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Weight Configurations</h1>
          <p className="text-sm text-slate-500">
            Exactly one configuration is active at a time. Every SPPIResult records which one was used (FR-25).
          </p>
        </div>
        <Link href="/admin/weight-configs/new" className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
          + New configuration
        </Link>
      </div>

      <div className="card divide-y divide-slate-100">
        {configs.map((c) => {
          const dims = c.dimensionWeights as { m: number; k: number; s: number };
          return (
            <div key={c.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium text-slate-900">
                  {c.name} {c.active && <span className="ml-2 rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">ACTIVE</span>}
                </p>
                <p className="text-sm text-slate-500">
                  Source: {c.source} · Dimensions M/K/S: {dims.m.toFixed(2)}/{dims.k.toFixed(2)}/{dims.s.toFixed(2)} · By {c.createdBy.name}
                </p>
              </div>
              {!c.active && <ActivateButton configId={c.id} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
