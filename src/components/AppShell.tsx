import type { ReactNode } from "react";
import type { AuthUser } from "@/lib/auth";
import { getCurrentTerm } from "@/lib/data";
import PortalChrome from "@/components/PortalChrome";

export default async function AppShell({ user, children }: { user: AuthUser; children: ReactNode }) {
  let termLabel = "Academic portal";
  try {
    const term = await getCurrentTerm();
    termLabel = `${term.session.name} · ${term.semester.name}`;
  } catch {
    termLabel = "Academic setup required";
  }
  return <PortalChrome user={user} termLabel={termLabel}>{children}</PortalChrome>;
}
