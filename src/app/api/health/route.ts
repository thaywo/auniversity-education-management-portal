import { db } from "@/db";
import { sql } from "drizzle-orm";
import { ensureSeeded } from "@/db/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    // Idempotent sample-data bootstrap. Failures here must not make the DB healthcheck fail.
    await ensureSeeded().catch((error) => console.error("Seed check:", error));
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
