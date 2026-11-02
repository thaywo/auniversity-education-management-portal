"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { AuthUser } from "@/lib/auth";

const roleLabels: Record<string, string> = {
  student: "Student",
  lecturer: "Lecturer",
  dept_admin: "Department Admin",
  super_admin: "Super Admin",
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

  // Prevent background scroll when mobile sidebar is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const items = navByRole[user.role] ?? [];
  const groups = [...new Set(items.map((item) => item.group))];
  const initials = user.fullName.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const renderNav = (isMobile = false) => (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500 text-lg font-black text-white shadow-lg shadow-emerald-950/40">U</span>
          <span className="min-w-0">
            <span className="block text-sm font-extrabold tracking-wide text-white">UEMP</span>
            <span className="block truncate text-[10px] uppercase tracking-[.14em] text-slate-400">University Portal</span>
          </span>
        </Link>
        {isMobile && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-emerald-300">Signed in as</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-white">{roleLabels[user.role]}</p>
          <p className="mt-0.5 truncate text-xs text-slate-400">{termLabel}</p>
        </div>

        {groups.map((group) => (
          <div key={group} className="mb-2">
            <p className="uemp-nav-section">{group}</p>
            <nav className="space-y-1">
              {items.filter((item) => item.group === group).map((item) => {
                const active = pathname === item.href || (item.href !== `/${user.role.replace("_admin", "")}` && pathname.startsWith(`${item.href}/`));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`uemp-nav-link ${active ? "uemp-nav-link-active" : ""}`}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className="w-5 text-center text-base opacity-90">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={logout}
          disabled={loggingOut}
          className="uemp-nav-link w-full text-left hover:!bg-rose-500/20 hover:!text-rose-200"
        >
          <span className="w-5 text-center text-base">↪</span>
          <span>{loggingOut ? "Signing out…" : "Sign out"}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f3f6fb] flex flex-col lg:flex-row">
      {/* Desktop Sticky Sidebar (Strictly in-flow so it NEVER overlaps main content) */}
      <aside className="uemp-sidebar hidden lg:flex lg:w-[264px] lg:shrink-0 lg:flex-col lg:sticky lg:top-0 lg:h-screen lg:z-30 border-r border-slate-800/30">
        {renderNav(false)}
      </aside>

      {/* Mobile Drawer (Slide-over drawer on small screens) */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            aria-hidden="true"
          />
          <aside className="uemp-sidebar relative z-10 flex h-full w-[280px] max-w-[85vw] flex-col shadow-2xl animate-in slide-in-from-left duration-200">
            {renderNav(true)}
          </aside>
        </div>
      )}

      {/* Main Content Viewport */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="no-print sticky top-0 z-20 flex h-[68px] items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open navigation menu"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-xl text-slate-700 hover:bg-slate-100 lg:hidden cursor-pointer"
            >
              ☰
            </button>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[.12em] text-slate-400 truncate">University Portal · UEMP</p>
              <p className="text-sm font-semibold text-slate-800 truncate">{termLabel}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden rounded-full bg-emerald-50 border border-emerald-200/60 px-3 py-1 text-xs font-semibold text-emerald-700 md:inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Secure Session
            </span>
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#0b1f3a] text-xs font-bold text-white shadow-xs">
                {initials}
              </span>
              <div className="hidden text-right sm:block">
                <p className="max-w-[160px] truncate text-xs font-bold text-slate-800">{user.fullName}</p>
                <p className="text-[11px] text-slate-500">{roleLabels[user.role]}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[1500px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
