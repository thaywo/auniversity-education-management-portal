"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const demoAccounts = [
  { role: "Super Admin", email: "super@uemp.edu", password: "Admin@123", initials: "SA", color: "bg-purple-100 text-purple-700", path: "/admin" },
  { role: "Department Admin", email: "cs.admin@uemp.edu", password: "Admin@123", initials: "DA", color: "bg-blue-100 text-blue-700", path: "/department" },
  { role: "Lecturer", email: "okafor@uemp.edu", password: "Lecturer@123", initials: "LE", color: "bg-amber-100 text-amber-700", path: "/lecturer" },
  { role: "Student", email: "amina@uemp.edu", password: "Student@123", initials: "ST", color: "bg-emerald-100 text-emerald-700", path: "/student" },
];

export default function LoginForm({ initialError }: { initialError?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState(initialError ?? "");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.message ?? "Unable to sign in.");
        return;
      }
      router.push(data.redirectTo);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-7">
        <p className="text-[11px] font-bold uppercase tracking-[.18em] text-emerald-700">Secure access</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Welcome back to UEMP</h1>
        <p className="mt-2 text-sm text-slate-500">Sign in with your university account. You will be redirected to your role workspace.</p>
      </div>
      <form onSubmit={submit}>
        {error && <div className="uemp-alert uemp-alert-error" role="alert">{error}</div>}
        <div className="mb-4">
          <label className="uemp-label" htmlFor="email">Email address</label>
          <input id="email" className="uemp-input" type="email" autoComplete="username" placeholder="name@uemp.edu"
            value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        <div className="mb-5">
          <label className="uemp-label" htmlFor="password">Password</label>
          <div className="relative">
            <input id="password" className="uemp-input !pr-16" type={show ? "text" : "password"} autoComplete="current-password"
              placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
              {show ? "HIDE" : "SHOW"}
            </button>
          </div>
        </div>
        <button type="submit" disabled={loading} className="uemp-btn uemp-btn-primary w-full !py-3">
          {loading ? "Verifying credentials…" : "Sign in securely →"}
        </button>
      </form>

      <div className="mt-8 border-t border-slate-200 pt-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-[.1em] text-slate-500">Test accounts</p>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">CLICK TO FILL</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {demoAccounts.map((account) => (
            <button key={account.email} type="button" onClick={() => { setEmail(account.email); setPassword(account.password); setError(""); }}
              className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-emerald-400 hover:shadow-sm">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xs font-bold ${account.color}`}>{account.initials}</span>
              <span className="min-w-0">
                <span className="block text-xs font-bold text-slate-800">{account.role}</span>
                <span className="block truncate text-[11px] text-slate-500">{account.email}</span>
              </span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-slate-400">All demo passwords are shown on the public landing page. Sample data is seeded automatically on first run.</p>
      </div>
    </div>
  );
}
