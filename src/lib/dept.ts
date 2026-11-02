import { eq } from "drizzle-orm";
import { db } from "@/db";
import { departments } from "@/db/schema";
import { requireRole } from "@/lib/auth";

/** Every departmental page uses this helper so the scope cannot be taken from a form/URL. */
export async function getDepartmentContext() {
  const user = await requireRole(["dept_admin"]);
  if (!user.departmentId) throw new Error("This administrator account has no department assignment.");
  const rows = await db.select({ id: departments.id, name: departments.name, code: departments.code })
    .from(departments).where(eq(departments.id, user.departmentId)).limit(1);
  return {
    user,
    departmentId: user.departmentId,
    department: rows[0]?.name ?? "Assigned department",
    departmentCode: rows[0]?.code ?? "",
  };
}
