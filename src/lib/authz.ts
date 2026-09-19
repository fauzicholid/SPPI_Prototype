import type { Role, ProjectRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type SessionUser = { id: string; role: Role };

/** Table 1 (Section 3): portfolio-level view is denied to Project Manager only. */
export function canViewPortfolio(role: Role): boolean {
  return role !== "PROJECT_MANAGER";
}

/** Table 1: only Researcher and Admin may create/activate a WeightConfig. */
export function canManageWeightConfig(role: Role): boolean {
  return role === "RESEARCHER" || role === "ADMIN";
}

/** Table 1: only Admin manages user accounts and roles. */
export function canManageUsers(role: Role): boolean {
  return role === "ADMIN";
}

/** Viewer's access is read-only everywhere it is granted at all. */
export function isReadOnlyRole(role: Role): boolean {
  return role === "VIEWER";
}

export function canCreateProjects(role: Role): boolean {
  return role === "PROJECT_MANAGER" || role === "PMO_PORTFOLIO" || role === "RESEARCHER" || role === "ADMIN";
}

export interface ProjectAccess {
  isOwnerOrAssessor: boolean;
  isAssigned: boolean;
  assignmentRole: ProjectRole | null;
}

/**
 * Server-side project scoping (FR-26, FR-27). A Project Manager's read/write
 * access is limited to projects where they are recorded as owner or
 * assessor; other roles are scoped per Table 1. This must be checked on
 * every request — never inferred from what the client UI currently shows.
 */
export async function getProjectAccess(userId: string, projectId: string): Promise<ProjectAccess> {
  const [project, assignment] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { ownerId: true } }),
    prisma.projectAssignment.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { role: true },
    }),
  ]);

  const isOwner = project?.ownerId === userId;
  const isOwnerOrAssessor = isOwner || assignment?.role === "OWNER" || assignment?.role === "ASSESSOR";
  const isAssigned = isOwner || assignment != null;

  return {
    isOwnerOrAssessor,
    isAssigned,
    assignmentRole: assignment?.role ?? (isOwner ? "OWNER" : null),
  };
}

/**
 * Can this user create/edit an assessment for this project? (Table 1 row 1)
 * PM: only their own project(s) (owner/assessor). PMO/Researcher/Admin: any.
 * Viewer: never.
 */
export async function canEditAssessmentForProject(user: SessionUser, projectId: string): Promise<boolean> {
  if (user.role === "VIEWER") return false;
  if (user.role === "PMO_PORTFOLIO" || user.role === "RESEARCHER" || user.role === "ADMIN") return true;
  if (user.role === "PROJECT_MANAGER") {
    const access = await getProjectAccess(user.id, projectId);
    return access.isOwnerOrAssessor;
  }
  return false;
}

/**
 * Can this user view this project's dashboard? (Table 1 row 2)
 * All roles yes for their own scope; PM/Viewer scoped to assignment.
 */
export async function canViewProjectDashboard(user: SessionUser, projectId: string): Promise<boolean> {
  if (user.role === "PMO_PORTFOLIO" || user.role === "RESEARCHER" || user.role === "ADMIN") return true;
  const access = await getProjectAccess(user.id, projectId);
  if (user.role === "PROJECT_MANAGER") return access.isOwnerOrAssessor;
  if (user.role === "VIEWER") return access.isAssigned;
  return false;
}

/** Export PDF (Table 1 row: Export PDF). Same shape as dashboard view. */
export async function canExportPdf(user: SessionUser, projectId: string): Promise<boolean> {
  return canViewProjectDashboard(user, projectId);
}

/**
 * Project ids this user may see, for scoping list queries (portfolio /
 * "my projects"). PMO/Researcher/Admin see all; PM and Viewer see only
 * their assigned projects.
 */
export async function visibleProjectIdsFor(user: SessionUser): Promise<string[] | "ALL"> {
  if (user.role === "PMO_PORTFOLIO" || user.role === "RESEARCHER" || user.role === "ADMIN") return "ALL";

  const [owned, assigned] = await Promise.all([
    prisma.project.findMany({ where: { ownerId: user.id }, select: { id: true } }),
    prisma.projectAssignment.findMany({ where: { userId: user.id }, select: { projectId: true } }),
  ]);
  const ids = new Set<string>();
  owned.forEach((p) => ids.add(p.id));
  assigned.forEach((a) => ids.add(a.projectId));
  return Array.from(ids);
}
