import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { rolePermissions, type Role } from "@/db/schema";
import type { AuthUser } from "@/lib/auth";

export const PERMISSION_CATALOG = [
  { key: "student.register", label: "Register courses", roles: ["student"] },
  { key: "student.view_results", label: "View approved results", roles: ["student"] },
  { key: "lecturer.enter_results", label: "Enter CA & exam scores", roles: ["lecturer"] },
  { key: "lecturer.submit_results", label: "Submit results for review", roles: ["lecturer"] },
  { key: "dept.manage_students", label: "Manage departmental students", roles: ["dept_admin"] },
  { key: "dept.manage_lecturers", label: "Manage lecturer profiles", roles: ["dept_admin"] },
  { key: "dept.manage_courses", label: "Manage departmental courses", roles: ["dept_admin"] },
  { key: "dept.manage_programs", label: "Manage programs & academic levels", roles: ["dept_admin"] },
  { key: "dept.assign_courses", label: "Allocate courses to lecturers", roles: ["dept_admin"] },
  { key: "dept.review_results", label: "Approve / return results", roles: ["dept_admin"] },
  { key: "dept.view_reports", label: "View departmental reports", roles: ["dept_admin"] },
  { key: "admin.manage_structure", label: "Manage faculties, departments & programs", roles: ["super_admin"] },
  { key: "admin.manage_users", label: "Manage all user accounts", roles: ["super_admin"] },
  { key: "admin.manage_sessions", label: "Manage sessions & semesters", roles: ["super_admin"] },
  { key: "admin.manage_courses", label: "Manage university courses & allocations", roles: ["super_admin"] },
  { key: "admin.view_reports", label: "Access university-wide reports", roles: ["super_admin"] },
  { key: "admin.view_audit", label: "Monitor audit trail", roles: ["super_admin"] },
] as const;

export type PermissionKey = (typeof PERMISSION_CATALOG)[number]["key"];

/** Super Admin always retains full control; all other roles use the persisted matrix. */
export async function hasPermission(user: AuthUser, permission: string): Promise<boolean> {
  if (user.role === "super_admin") return true;
  const rows = await db
    .select({ enabled: rolePermissions.enabled })
    .from(rolePermissions)
    .where(and(eq(rolePermissions.role, user.role), eq(rolePermissions.permission, permission)))
    .limit(1);
  return rows[0]?.enabled === true;
}

export async function requirePermission(user: AuthUser, permission: string): Promise<void> {
  if (!(await hasPermission(user, permission))) {
    throw new Error(`Forbidden: the "${permission}" permission is disabled for your role.`);
  }
}

export async function getPermissionMatrix() {
  return db.select().from(rolePermissions).orderBy(rolePermissions.role, rolePermissions.permission);
}
