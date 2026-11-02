import { randomBytes, createHash, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users, type Role } from "@/db/schema";

const COOKIE_NAME = "uemp_session";
const SESSION_DAYS = 7;

export type AuthUser = {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  status: string;
  departmentId: number | null;
  phone: string | null;
};

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, expected] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");
  if (actual.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actual, expectedBuffer);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ tokenHash: hashToken(token), userId, expiresAt });
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
  store.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      status: users.status,
      departmentId: users.departmentId,
      phone: users.phone,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const user = rows[0];
  if (!user || user.status !== "active") return null;
  return user;
}

/** Page guard: redirects unauthenticated or wrong-role visitors. */
export async function requireRole(roles: Role[]): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!roles.includes(user.role)) redirect(`/login?error=${encodeURIComponent("You do not have access to that workspace.")}`);
  return user;
}

/** Action guard: never redirects; throws so the caller can return a friendly message. */
export async function requireActionUser(roles: Role[]): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Your session has expired. Please sign in again.");
  if (!roles.includes(user.role)) throw new Error("Forbidden: your role cannot perform this action.");
  return user;
}

export function dashboardPath(role: Role): string {
  switch (role) {
    case "student": return "/student";
    case "lecturer": return "/lecturer";
    case "dept_admin": return "/department";
    case "super_admin": return "/admin";
  }
}

export const roleLabels: Record<Role, string> = {
  student: "Student",
  lecturer: "Lecturer",
  dept_admin: "Department Admin",
  super_admin: "Super Admin",
};
