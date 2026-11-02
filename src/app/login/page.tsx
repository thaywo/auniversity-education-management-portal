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
    <div className="grid min-h-screen bg-white lg:grid-cols-[1fr_1.05fr]">
      <aside className="uemp-login-art uemp-grid-lines relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-400 text-lg font-black text-[#0b1f3a]">U</span>
          <span><span className="block text-base font-extrabold">UEMP</span><span className="block text-[10px] uppercase tracking-[.15em] text-slate-300">University Portal</span></span>
        </Link>
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-300">Academic operations, unified</p>
          <h2 className="mt-4 max-w-lg text-4xl font-bold leading-tight">Secure access for every member of the university.</h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-300">Students, lecturers, departmental reviewers and university administrators each see exactly the data and actions their role permits.</p>
          <div className="mt-10 grid max-w-md grid-cols-2 gap-3">
            {["Scrypt-hashed passwords", "HTTP-only sessions", "Server-side RBAC", "Full audit trail"].map((item) => (
              <div key={item} className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-xs font-semibold text-slate-200">✓ {item}</div>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-400">© {new Date().getFullYear()} Lead Web Praxis Media Limited · UEMP</p>
      </aside>
      <main className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[480px]">
          <Link href="/" className="mb-8 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-emerald-700 lg:hidden">← Back to overview</Link>
          <div className="uemp-panel p-6 sm:p-8"><LoginForm initialError={error} /></div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <Link href="/" className="hover:text-emerald-700">← Back to overview</Link>
            <Link href="/documentation" className="hover:text-emerald-700">Technical documentation</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
