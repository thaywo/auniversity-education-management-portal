import Link from "next/link";
import { redirect } from "next/navigation";
import { dashboardPath, getCurrentUser } from "@/lib/auth";
import { ensureSeeded } from "@/db/seed";
import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await ensureSeeded().catch(() => null);
  const user = await getCurrentUser();
  if (user) redirect(dashboardPath(user.role));
  const { error } = await searchParams;

  return (
    <div className="grid min-h-screen bg-[#f8fafc] lg:grid-cols-[1fr_1.1fr]">
      {/* Brand Aside (Desktop) */}
      <aside className="uemp-login-art relative hidden flex-col justify-between overflow-hidden p-10 lg:flex shadow-2xl">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-400 text-lg font-black text-[#07172c] shadow-md">
            U
          </span>
          <span>
            <span className="block text-base font-extrabold text-white">UEMP</span>
            <span className="block text-[10px] uppercase tracking-[.15em] text-emerald-300">University Portal</span>
          </span>
        </Link>

        <div className="relative z-10 my-auto py-12">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-950/60 px-3.5 py-1 text-xs font-bold uppercase tracking-[.16em] text-emerald-300 backdrop-blur-xs">
            Academic Operations Unified
          </span>
          <h2 className="mt-5 max-w-lg text-4xl font-extrabold leading-tight text-white">
            Secure, role-based access for the entire institution.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-200">
            Students, lecturers, departmental review committees, and university administrators each see precisely the tools, workflows, and reports their authorization allows.
          </p>

          <div className="mt-8 grid max-w-md grid-cols-2 gap-3">
            {[
              "Scrypt Hashed Passwords",
              "HttpOnly Session Cookies",
              "Server-Side RBAC Guards",
              "Comprehensive Audit Trail",
            ].map((item) => (
              <div key={item} className="rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5 text-xs font-semibold text-slate-100 backdrop-blur-xs">
                ✓ {item}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-white/10 pt-4 text-xs text-slate-300">
          © {new Date().getFullYear()} Lead Web Praxis Media Limited · Assessment Test
        </div>
      </aside>

      {/* Main Login Viewport */}
      <main className="flex items-center justify-center p-4 sm:p-8 lg:p-12">
        <div className="w-full max-w-[480px]">
          <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700 transition-colors">
            <span>←</span>
            <span>Back to Portal Overview</span>
          </Link>

          <div className="uemp-panel p-6 sm:p-8 bg-white shadow-xl">
            <LoginForm initialError={error} />
          </div>

          <div className="mt-5 flex items-center justify-between text-xs text-slate-500">
            <Link href="/" className="hover:text-emerald-700 font-medium">← Overview</Link>
            <Link href="/documentation" className="hover:text-emerald-700 font-medium">Technical Documentation →</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
