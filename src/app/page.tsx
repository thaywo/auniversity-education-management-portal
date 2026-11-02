import Link from "next/link";
import { dashboardPath, getCurrentUser } from "@/lib/auth";
import { ensureSeeded } from "@/db/seed";

export const dynamic = "force-dynamic";

const credentials = [
  { 
    role: "Super Admin", 
    name: "Prof. Ngozi Eze",
    email: "super@uemp.edu", 
    password: "Admin@123", 
    scope: "University-wide Administration",
    badge: "Full Access",
    badgeColor: "bg-purple-100 text-purple-700 border-purple-200",
    description: "Structure (Faculties/Depts), academic sessions, user management, grading scale, approvals and university audits."
  },
  { 
    role: "Department Admin", 
    name: "Mrs. Funke Adeyemi",
    email: "cs.admin@uemp.edu", 
    password: "Admin@123", 
    scope: "Computer Science Dept",
    badge: "Dept Reviewer",
    badgeColor: "bg-blue-100 text-blue-700 border-blue-200",
    description: "Review lecturer score submissions, approve or return results with remarks, manage programs, courses and student allocations."
  },
  { 
    role: "Lecturer", 
    name: "Dr. Chinedu Okafor",
    email: "okafor@uemp.edu", 
    password: "Lecturer@123", 
    scope: "CSC201 & CSC203",
    badge: "Course Lecturer",
    badgeColor: "bg-amber-100 text-amber-700 border-amber-200",
    description: "Access assigned class lists, enter and calculate CA/Exam scores, review grade distribution and submit result rosters."
  },
  { 
    role: "Student", 
    name: "Amina Ibrahim",
    email: "amina@uemp.edu", 
    password: "Student@123", 
    scope: "200L Computer Science",
    badge: "Undergraduate",
    badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
    description: "Register semester courses with 24-unit limit validation, print course forms, view published results and track semester GPA/CGPA."
  },
];

const modules = [
  { 
    icon: "🔐", 
    title: "Granular Role-Based Access Control", 
    text: "Four distinct workspaces guarded by server-side session authentication, bcrypt/scrypt hashing, and customizable permission matrices." 
  },
  { 
    icon: "📚", 
    title: "Course Registration Engine", 
    text: "Validation against department, degree program, academic level, and term prerequisites with strict 24-credit ceiling controls." 
  },
  { 
    icon: "✍️", 
    title: "Multi-Stage Result Workflow", 
    text: "Structured lifecycle: Draft Score Entry → Lecturer Submission → Department Review & Moderation → Approval & Student Publication." 
  },
  { 
    icon: "📊", 
    title: "Automated GPA & Official Transcripts", 
    text: "Configurable grading band evaluation, weighted grade point calculations, semester GPA and cumulative CGPA generation with print/download." 
  },
];

export default async function HomePage() {
  await ensureSeeded().catch(() => null);
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 px-4 py-3.5 backdrop-blur-md sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#07172c] text-lg font-black text-emerald-400 shadow-md">
              U
            </span>
            <div>
              <span className="block text-base font-extrabold tracking-tight text-slate-900 leading-tight">UEMP</span>
              <span className="block text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">University Portal</span>
            </div>
          </Link>

          <nav className="flex items-center gap-3">
            <Link 
              href="/documentation" 
              className="hidden sm:inline-flex px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition-colors"
            >
              Documentation
            </Link>
            <Link 
              href={user ? dashboardPath(user.role) : "/login"} 
              className="uemp-btn uemp-btn-primary"
            >
              {user ? "Open Dashboard →" : "Sign In to Portal"}
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="uemp-login-art relative overflow-hidden py-16 lg:py-24 px-4 sm:px-8 shadow-inner">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Hero Left Content */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-950/60 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[.14em] text-emerald-300 backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Lead Web Praxis Media Limited · Assessment Project
            </div>

            <h1 className="mt-6 text-4xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-5xl lg:text-[54px]">
              University Education <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200 bg-clip-text text-transparent">
                Management Portal
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-base sm:text-lg leading-relaxed text-slate-200 font-normal">
              A comprehensive academic management system delivering end-to-end course registration, 
              moderated score entry, departmental review, GPA computation and university governance.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link 
                href="/login" 
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/40 hover:bg-emerald-400 transition-all transform hover:-translate-y-0.5"
              >
                Launch Portal Login →
              </Link>
              <Link 
                href="#demo-credentials" 
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-sm hover:bg-white/20 transition-all"
              >
                View Test Accounts
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4 border-t border-white/10 pt-6 text-slate-300">
              <div>
                <p className="text-2xl font-black text-white">4</p>
                <p className="text-xs text-slate-300">Dedicated Workspaces</p>
              </div>
              <div>
                <p className="text-2xl font-black text-white">100%</p>
                <p className="text-xs text-slate-300">Server-Side RBAC</p>
              </div>
              <div>
                <p className="text-2xl font-black text-white">24 Units</p>
                <p className="text-xs text-slate-300">Credit Cap Validation</p>
              </div>
              <div>
                <p className="text-2xl font-black text-white">MySQL</p>
                <p className="text-xs text-slate-300">Relational Database</p>
              </div>
            </div>
          </div>

          {/* Hero Right Visual Preview */}
          <div className="rounded-2xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/15 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.14em] text-emerald-300">Role Workspaces</p>
                <p className="text-sm font-semibold text-white">Pre-configured Role Archetypes</p>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
                Ready to Test
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {[
                { role: "Super Admin", desc: "System structure, sessions, users & audits", color: "text-purple-300 bg-purple-500/20" },
                { role: "Department Admin", desc: "Course allocations & score approvals", color: "text-blue-300 bg-blue-500/20" },
                { role: "Lecturer", desc: "Roster access, CA/Exam score entry & submission", color: "text-amber-300 bg-amber-500/20" },
                { role: "Student", desc: "Course registration, results & statement of results", color: "text-emerald-300 bg-emerald-500/20" },
              ].map((item, idx) => (
                <div key={item.role} className="flex items-center gap-3.5 rounded-xl border border-white/10 bg-white/5 p-3.5 transition hover:bg-white/10">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xs font-bold ${item.color}`}>
                    0{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white leading-snug">{item.role}</p>
                    <p className="text-xs text-slate-300 truncate">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 border-t border-white/10 pt-4">
              <Link 
                href="/login" 
                className="block w-full text-center rounded-xl bg-white/15 py-2.5 text-xs font-bold text-white hover:bg-white/25 transition-colors"
              >
                Sign in to any demo workspace →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Test Accounts / Demo Credentials Section */}
      <section id="demo-credentials" className="py-16 px-4 sm:px-8 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-700">Evaluation Access</p>
              <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
                Pre-Seeded Test Credentials
              </h2>
              <p className="mt-2 text-sm text-slate-600 max-w-2xl">
                The database is pre-populated with realistic university data. Select any account below to explore that role's interface and capabilities.
              </p>
            </div>
            <Link href="/login" className="uemp-btn uemp-btn-primary shrink-0 self-start md:self-auto">
              Go to Login Page →
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {credentials.map((card) => (
              <div 
                key={card.email} 
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-5 shadow-xs transition hover:border-emerald-300 hover:shadow-md hover:bg-white"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${card.badgeColor}`}>
                      {card.badge}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">{card.scope}</span>
                  </div>

                  <h3 className="mt-3 text-lg font-bold text-slate-900">{card.role}</h3>
                  <p className="text-xs font-semibold text-slate-600">{card.name}</p>
                  <p className="mt-2 text-xs text-slate-500 leading-relaxed">{card.description}</p>
                </div>

                <div className="mt-5 border-t border-slate-200 pt-4">
                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/80">
                      <span className="text-slate-400 font-sans">Email:</span>
                      <span className="font-bold text-slate-800 select-all">{card.email}</span>
                    </div>
                    <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/80">
                      <span className="text-slate-400 font-sans">Password:</span>
                      <span className="font-bold text-emerald-700 select-all">{card.password}</span>
                    </div>
                  </div>

                  <Link
                    href="/login"
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-800 py-2 text-xs font-bold text-white hover:bg-emerald-600 transition-colors"
                  >
                    <span>Sign In as {card.role}</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Platform Modules */}
      <section className="py-16 px-4 sm:px-8 bg-[#f8fafc]">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-700">Platform Features</p>
            <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
              Complete Academic Lifecycle Management
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Designed according to real Nigerian university academic regulations, accreditation requirements, and strict RBAC isolation.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {modules.map((module) => (
              <div key={module.title} className="uemp-panel p-6 flex flex-col justify-between">
                <div>
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-100/70 text-2xl">
                    {module.icon}
                  </span>
                  <h3 className="mt-4 text-base font-bold text-slate-900 leading-snug">{module.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">{module.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-8 px-4 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl">
          <p className="font-bold text-slate-800">LEAD WEB PRAXIS MEDIA LIMITED</p>
          <p className="mt-1 text-slate-500">
            University Education Management Portal · Practical Assessment Project · Built with Next.js & MySQL
          </p>
        </div>
      </footer>
    </div>
  );
}
