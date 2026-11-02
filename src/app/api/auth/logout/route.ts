import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { destroySession, getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getCurrentUser();
  if (user) {
    await db.insert(auditLogs).values({
      userId: user.id, actorName: user.fullName, action: "USER_LOGOUT", entity: "session",
      entityId: String(user.id), departmentId: user.departmentId, details: { role: user.role },
    });
  }
  await destroySession();
  return Response.json({ ok: true });
}
