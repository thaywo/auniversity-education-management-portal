import Link from "next/link";
import { dashboardPath, getCurrentUser } from "@/lib/auth";
import { ensureSeeded } from "@/db/seed";

export const dynamic = "force-dynamic";

const credentials = [
  { role: "Super Admin", email: "super@uemp.edu", password: "Admin@123", scope: "University-wide" },
  { role: "Department Admin", email: "cs.admin@uemp.edu", password: "Admin@123", scope: "Computer Science" },
  { role: "Lecturer", email: "okafor@uemp.edu", password: "Lecturer@123", scope: "Assigned courses" },
  { role: "Student", email: "amina@uemp.edu", password: "Student@123", scope: "200 Level CSC" },
];

const modules = [
  { icon: "🔐", title: "Role-based access", text: "Four workspaces, server-side guards, database-backed sessions and a configurable permission matrix." },
  { icon: "📚", title: "Course registration", text: "Department, program, level and semester eligibility checks with duplicate and credit-unit validation." },
  { icon: "✍️", title: "Result workflow", text: "Draft scores → lecturer submission → departmental review → approval → student publication." },
  { icon: "🧾", title: "Audit & reporting", text: "Every score change, approval, rejection and administrative action is traceable with CSV reports." },
];

export default async function HomePage() {
  await ensureSeeded().catch(() => null);
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0b1f3a] text-lg font-black text-emerald-400">U</span>
          <span>
            <span className="block text-sm font-extrabold tracking-wide text-slate-900">UEMP</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[.14em] text-slate-500">University Portal</span>
          </span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/documentation" className="hidden text-sm font-semibold text-slate-600 hover:text-emerald-700 sm:inline">Documentation</Link>
          <Link href={user ? dashboardPath(user.role) : "/login"} className="uemp-btn uemp-btn-primary">
            {user ? "Open my dashboard" : "Sign in"}
          </Link>
        </nav>
      </header>

      <section className="uemp-login-art uemp-grid-lines relative overflow-hidden text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1.1fr_.9fr] lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[.14em] text-emerald-200">
              Lead Web Praxis Media Limited · Practical Assessment
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[58px]">
              University Education<br /><span className="text-emerald-300">Management Portal</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-200">
              One secure academic workspace for course registration, result entry, departmental approval, GPA computation and university-wide administration.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="uemp-btn !bg-emerald-500 !px-6 !py-3 hover:!bg-emerald-400">Launch portal →</Link>
              <Link href="/documentation" className="uemp-btn !border-white/30 !bg-white/10 !px-6 !py-3 !text-white hover:!bg-white/20">Read technical docs</Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-300">
              <span><strong className="text-white">4</strong> role dashboards</span>
              <span><strong className="text-white">4</strong> core workflows</span>
              <span><strong className="text-white">16+</strong> protected modules</span>
              <span><strong className="text-white">100%</strong> server-side RBAC</span>
            </div>
          </div>
          <div className="rounded-3xl border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-200">Role workspaces</p>
            <div className="mt-4 space-y-3">
              {[
                ["Student", "Register courses · view approved results · CGPA"],
                ["Lecturer", "Class lists · CA/exam scores · submit results"],
                ["Department Admin", "Students · courses · allocations · approvals"],
                ["Super Admin", "Faculties · sessions · users · audit · reports"],
              ].map(([role, text], index) => (
                <div key={role} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-400/20 text-sm font-bold text-emerald-200">0{index + 1}</span>
                  <div><p className="text-sm font-bold">{role}</p><p className="mt-0.5 text-xs text-slate-300">{text}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <p className="text-[11px] font-bold uppercase tracking-[.16em] text-emerald-700">Platform modules</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Built for the complete academic lifecycle</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((module) => (
            <div key={module.title} className="uemp-panel p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-xl">{module.icon}</span>
              <h3 className="mt-4 text-base font-bold text-slate-900">{module.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{module.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.16em] text-emerald-700">Evaluation access</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Test login credentials</h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-500">
                Sample data is seeded automatically. Use these accounts to exercise course registration, result submission, approval and administration.
              </p>
              <Link href="/login" className="uemp-btn uemp-btn-navy mt-5">Go to secure login</Link>
            </div>
            <div className="uemp-panel overflow-hidden">
              <div className="uemp-table-wrap">
                <table className="uemp-table" style={{ minWidth: 560 }}>
                  <thead><tr><th>Role</th><th>Email</th><th>Password</th><th>Scope</th></tr></thead>
                  <tbody>
                    {credentials.map((row) => (
                      <tr key={row.email}>
                        <td className="strong">{row.role}</td>
                        <td><code className="rounded bg-slate-100 px-2 py-1 text-xs">{row.email}</code></td>
                        <td><code className="rounded bg-slate-100 px-2 py-1 text-xs">{row.password}</code></td>
                        <td>{row.scope}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-500">
        <p className="font-semibold text-slate-700">LEAD WEB PRAXIS MEDIA LIMITED</p>
        <p className="mt-1">Building secure, scalable, and intelligent technology solutions · UEMP Practical Software Development Test</p>
      </footer>
    </div>
  );
}
