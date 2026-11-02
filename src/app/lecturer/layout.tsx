import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth";
import AppShell from "@/components/AppShell";

export const dynamic = "force-dynamic";

export default async function LecturerLayout({ children }: { children: ReactNode }) {
  const user = await requireRole(["lecturer"]);
  return <AppShell user={user}>{children}</AppShell>;
}
