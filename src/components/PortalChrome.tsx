"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { AuthUser } from "@/lib/auth";

const roleLabels: Record<string, string> = {
  student: "Student", lecturer: "Lecturer",
  dept_admin: "Department Admin", super_admin: "Super Admin",
};

export type NavItem = { href: string; label: string; icon: string; group: string };

const navByRole: Record<string, NavItem[]> = {
  student: [
    { href: "/student", label: "Dashboard", icon: "◉", group: "Workspace" },
    { href: "/student/courses", label: "Course Registration", icon: "▤", group: "Academics" },
    { href: "/student/results", label: "Semester Results", icon: "◈", group: "Academics" },
    { href: "/student/history", label: "Academic History", icon: "◷", group: "Academics" },
    { href: "/student/documents", label: "Print / Download", icon: "▣", group: "Records" },
    { href: "/student/profile", label: "My Profile", icon: "◎", group: "Records" },
  ],
  lecturer: [
    { href: "/lecturer", label: "Dashboard", icon: "◉", group: "Workspace" },
    { href: "/lecturer/courses", label: "Assigned Courses", icon: "▤", group: "Teaching" },
    { href: "/lecturer/performance", label: "Performance Summary", icon: "◈", group: "Teaching" },
    { href: "/lecturer/submissions", label: "Submission Status", icon: "✓", group: "Teaching" },
    { href: "/lecturer/profile", label: "My Profile", icon: "◎", group: "Records" },
  ],
  dept_admin: [
    { href: "/department", label: "Dashboard", icon: "◉", group: "Workspace" },
    { href: "/department/results", label: "Result Review", icon: "✓", group: "Approval Workflow" },
    { href: "/department/students", label: "Students", icon: "◎", group: "Department Records" },
    { href: "/department/lecturers", label: "Lecturers", icon: "◍", group: "Department Records" },
    { href: "/department/courses", label: "Courses", icon: "▤", group: "Department Records" },
    { href: "/department/allocations", label: "Course Allocations", icon: "⇄", group: "Department Records" },
    { href: "/department/programs", label: "Programs & Levels", icon: "▣", group: "Department Records" },
    { href: "/department/registrations", label: "Registrations", icon: "▥", group: "Reports" },
    { href: "/department/reports", label: "Departmental Reports", icon: "◈", group: "Reports" },
    { href: "/department/audit", label: "Department Audit", icon: "◷", group: "Reports" },
  ],
  super_admin: [
    { href: "/admin", label: "University Dashboard", icon: "◉", group: "Workspace" },
    { href: "/admin/structure", label: "Faculties & Departments", icon: "▦", group: "Academic Structure" },
    { href: "/admin/programs", label: "Programs & Levels", icon: "▣", group: "Academic Structure" },
    { href: "/admin/sessions", label: "Sessions & Semesters", icon: "◷", group: "Academic Structure" },
    { href: "/admin/courses", label: "Courses", icon: "▤", group: "Academic Structure" },
    { href: "/admin/allocations", label: "Course Allocations", icon: "⇄", group: "Academic Structure" },
    { href: "/admin/users", label: "Users & Roles", icon: "◎", group: "Administration" },
    { href: "/admin/permissions", label: "Permissions", icon: "⚿", group: "Administration" },
    { href: "/admin/grading", label: "Grading Scale", icon: "⚙", group: "Administration" },
    { href: "/admin/registrations", label: "Registrations Monitor", icon: "▥", group: "Oversight" },
    { href: "/admin/approvals", label: "Result Approvals", icon: "✓", group: "Oversight" },
    { href: "/admin/reports", label: "University Reports", icon: "◈", group: "Oversight" },
    { href: "/admin/audit", label: "Audit Trail", icon: "◈", group: "Oversight" },
  ],
};

export default function PortalChrome({ user, termLabel, children }: {
  user: AuthUser; termLabel: string; children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  useEffect(() => { setOpen(false); }, [pathname]);
  const items = navByRole[user.role] ?? [];
  const groups = [...new Set(items.map((item) => item.group))];
  const initials = user.fullName.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const navContent = (
    <>
      <Link href="/" className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500 text-lg font-black text-white shadow-lg shadow-emerald-900/30">U</span>
        <span className="min-w-0">
          <span className="block text-sm font-extrabold tracking-wide text-white">UEMP</span>
          <span className="block truncate text-[10px] uppercase tracking-[.14em] text-slate-400">University Portal</span>
        </span>
      </Link>
      <div className="flex-1 overflow-y-auto px-3 pb-6">
        <div className="my-4 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-emerald-300">Signed in as</p>
          <p className="mt-1 text-sm font-semibold text-white">{roleLabels[user.role]}</p>
          <p className="mt-0.5 truncate text-xs text-slate-400">{termLabel}</p>
        </div>
        {groups.map((group) => (
          <div key={group}>
            <p className="uemp-nav-section">{group}</p>
            <nav className="space-y-1">
              {items.filter((item) => item.group === group).map((item) => {
                const active = pathname === item.href || (item.href !== `/${user.role.replace("_admin", "")}` && pathname.startsWith(`${item.href}/`));
                return (
                  <Link key={item.href} href={item.href}
                    className={`uemp-nav-link ${active ? "uemp-nav-link-active" : ""}`}
                    aria-current={active ? "page" : undefined}>
                    <span className="w-5 text-center text-base opacity-90">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10 p-4">
        <button onClick={logout} disabled={loggingOut} className="uemp-nav-link w-full text-left">
          <span className="w-5 text-center text-base">↪</span>{loggingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="uemp-sidebar hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-[264px] lg:flex-col">{navContent}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Close menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-slate-950/60" />
          <aside className="uemp-sidebar relative flex h-full w-[280px] flex-col shadow-2xl">{navContent}</aside>
        </div>
      )}
      <div className="min-w-0">
        <header className="no-print sticky top-0 z-20 flex h-[68px] items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(true)} aria-label="Open menu" className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-xl text-slate-600 lg:hidden">☰</button>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold uppercase tracking-[.12em] text-slate-400">Lead Web Praxis · UEMP</p>
              <p className="text-sm font-semibold text-slate-800">{termLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 md:inline-flex">● Secure session</span>
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-navy-900 text-xs font-bold text-white" style={{ background: "#0b1f3a" }}>{initials}</span>
              <div className="hidden text-right sm:block">
                <p className="max-w-[180px] truncate text-xs font-semibold text-slate-800">{user.fullName}</p>
                <p className="text-[11px] text-slate-500">{roleLabels[user.role]}</p>
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
