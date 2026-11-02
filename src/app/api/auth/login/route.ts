import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { createSession, dashboardPath, verifyPassword } from "@/lib/auth";
import { ensureSeeded } from "@/db/seed";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, message: "Invalid request body." }, { status: 400 });
  }
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!email || !password) {
    return Response.json({ ok: false, message: "Email and password are required." }, { status: 400 });
  }
  try {
    await ensureSeeded();
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return Response.json({ ok: false, message: "Invalid email or password." }, { status: 401 });
    }
    if (user.status !== "active") {
      return Response.json({ ok: false, message: `This account is ${user.status}. Please contact the administrator.` }, { status: 403 });
    }
    await createSession(user.id);
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
    await db.insert(auditLogs).values({
      userId: user.id, actorName: user.fullName, action: "USER_LOGIN", entity: "session",
      entityId: String(user.id), departmentId: user.departmentId,
      details: { role: user.role, userAgent: request.headers.get("user-agent")?.slice(0, 180) ?? null },
    });
    return Response.json({ ok: true, redirectTo: dashboardPath(user.role), role: user.role });
  } catch (error) {
    console.error("Login error:", error);
    return Response.json({ ok: false, message: "Unable to sign in. Please try again." }, { status: 500 });
  }
}
