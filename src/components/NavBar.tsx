"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Role } from "@prisma/client";

const ROLE_LABEL: Record<Role, string> = {
  PROJECT_MANAGER: "Project Manager",
  PMO_PORTFOLIO: "PMO / Portfolio",
  RESEARCHER: "Researcher",
  ADMIN: "Admin",
  VIEWER: "Viewer",
};

export function NavBar({ user }: { user: { name: string; role: Role } | null }) {
  const pathname = usePathname();
  if (!user || pathname === "/login") return null;

  const canPortfolio = user.role !== "PROJECT_MANAGER";
  const canWeightConfig = user.role === "RESEARCHER" || user.role === "ADMIN";
  const canAdmin = user.role === "ADMIN";
  const canAudit = user.role === "ADMIN" || user.role === "RESEARCHER";

  const links = [
    { href: "/projects", label: "Projects", show: true },
    { href: "/portfolio", label: "Portfolio", show: canPortfolio },
    { href: "/admin/weight-configs", label: "Weight Config", show: canWeightConfig },
    { href: "/admin/users", label: "Users", show: canAdmin },
    { href: "/admin/audit-log", label: "Audit Log", show: canAudit },
  ];

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/projects" className="text-lg font-bold text-slate-900">
            SPPI
          </Link>
          <nav className="flex gap-4 text-sm">
            {links
              .filter((l) => l.show)
              .map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded px-2 py-1 ${pathname.startsWith(l.href) ? "bg-slate-100 font-semibold text-slate-900" : "text-slate-600 hover:text-slate-900"}`}
                >
                  {l.label}
                </Link>
              ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <span>
            {user.name} <span className="text-slate-400">· {ROLE_LABEL[user.role]}</span>
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
