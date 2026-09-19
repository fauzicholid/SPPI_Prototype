import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AuditLogPage() {
  const session = await getServerSession(authOptions);
  const user = session!.user;
  if (user.role !== "ADMIN" && user.role !== "RESEARCHER") redirect("/projects");

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { actor: { select: { name: true, email: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Audit Log</h1>
        <p className="text-sm text-slate-500">Every WeightConfig change and role/permission change (FR-28), retained independently of assessment data.</p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">When</th>
              <th className="px-4 py-2">Actor</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">Target</th>
              <th className="px-4 py-2">Metadata</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-2 text-slate-500">{new Date(l.createdAt).toLocaleString()}</td>
                <td className="px-4 py-2 text-slate-700">{l.actor.name}</td>
                <td className="px-4 py-2 font-medium text-slate-900">{l.action}</td>
                <td className="px-4 py-2 text-slate-500">
                  {l.targetType} · {l.targetId.slice(0, 8)}
                </td>
                <td className="px-4 py-2 text-xs text-slate-400">{l.metadata ? JSON.stringify(l.metadata) : ""}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  No audit entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
