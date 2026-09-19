import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canManageUsers } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { NewUserForm } from "@/components/admin/NewUserForm";
import { RoleSelect } from "@/components/admin/RoleSelect";

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  const user = session!.user;
  if (!canManageUsers(user.role)) redirect("/projects");

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">User Accounts</h1>
        <p className="text-sm text-slate-500">Manage accounts and roles (Table 1, Section 3). Every role change is audit-logged (FR-28).</p>
      </div>

      <NewUserForm />

      <div className="card divide-y divide-slate-100">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="font-medium text-slate-900">{u.name}</p>
              <p className="text-sm text-slate-500">{u.email}</p>
            </div>
            <RoleSelect userId={u.id} currentRole={u.role} disabled={u.id === user.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
