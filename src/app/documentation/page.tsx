import Link from "next/link";
import { Badge } from "@/components/ui";

export const metadata = { title: "Technical Documentation | UEMP" };

const tables = [
  ["faculties, departments", "University organizational structure; departments belong to faculties."],
  ["programs, academic_levels", "Degree programs and active levels, scoped to departments."],
  ["academic_sessions, semesters", "Session/term definitions with exactly one current session and semester."],
  ["users, sessions", "Authentication identity (role, status, department) and hashed, expiring session tokens."],
  ["students", "Matriculation number, department, program, level, admission year and personal details."],
  ["lecturers", "Staff number, department, designation and qualification."],
  ["courses, course_allocations", "Course catalogue (code/title/units/level/program/semester) and lecturer assignments."],
  ["registrations", "Student ↔ course for a session/semester, with a composite unique key preventing duplicates."],
  ["results", "CA, exam, total, grade, grade point, status, approval metadata; one row per registration."],
  ["result_submissions", "Course-level draft/submitted/approved/returned workflow state and reviewer feedback."],
  ["grading_scale", "Configurable inclusive score bands and grade points used for GPA."],
  ["role_permissions", "Persistent RBAC matrix; Super Admin can enable/disable permissions for other roles."],
  ["audit_logs", "Who did what, to which entity, when, in which department, plus structured before/after details."],
  ["app_meta", "Idempotent seed marker used for safe first-run sample data bootstrap."],
];

const credentials = [
  ["Super Admin", "super@uemp.edu", "Admin@123"],
  ["Department Admin", "cs.admin@uemp.edu", "Admin@123"],
  ["Lecturer", "okafor@uemp.edu", "Lecturer@123"],
  ["Student", "amina@uemp.edu", "Student@123"],
];

export default function DocumentationPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#0b1f3a] text-sm font-black text-emerald-400">U</span>
            <span className="text-sm font-extrabold text-slate-900">UEMP Documentation</span>
          </Link>
          <Link href="/login" className="uemp-btn uemp-btn-primary uemp-btn-sm">Sign in</Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-5 py-10 sm:px-8">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.16em] text-emerald-700">Lead Web Praxis Media Limited</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">UEMP Technical Documentation</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">Architecture, database design, security model, business rules and setup instructions for the University Education Management Portal MVP.</p>
        </div>

        <section className="uemp-panel p-6">
          <h2 className="uemp-title">1. Technology stack & architecture</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[["Next.js 16 App Router", "Server Components, route handlers and Server Actions"], ["PostgreSQL + Drizzle ORM", "Relational schema, typed queries and transactions"], ["Tailwind CSS 4", "Responsive, print-ready component styling"], ["Node Crypto", "Scrypt password hashing and SHA-256 session tokens"]].map(([title, text]) => (
              <div key={title} className="rounded-xl bg-slate-50 p-4"><p className="text-sm font-bold text-slate-800">{title}</p><p className="mt-1 text-xs text-slate-500">{text}</p></div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">The application uses a server-first architecture. Pages are rendered on the server after session validation; all writes pass through Server Actions which independently re-check the session, role, permission and department scope. Route handlers provide authentication and CSV exports. The database is the single source of truth for users, academic structure, registrations, results, permissions and audit logs. There is no client-side trust boundary: a forged form, direct action call or crafted export URL still meets server-side authorization checks.</p>
        </section>

        <section className="uemp-panel p-6">
          <h2 className="uemp-title">2. Database structure / ER overview</h2>
          <p className="uemp-subtitle mt-1">Foreign keys link every academic record back to its owning department and term.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="uemp-table" style={{ minWidth: 620 }}>
              <thead><tr><th>Table(s)</th><th>Purpose & relationships</th></tr></thead>
              <tbody>{tables.map(([name, purpose]) => <tr key={name}><td className="strong"><code>{name}</code></td><td>{purpose}</td></tr>)}</tbody>
            </table>
          </div>
          <pre className="mt-5 overflow-x-auto rounded-xl bg-[#0b1f3a] p-4 text-[11px] leading-relaxed text-slate-200">{`faculties ──< departments ──< programs
                     │             └──< academic_levels
                     ├──< students ──< registrations >── courses ──< course_allocations >── lecturers
                     │                    │                  │                │
                     │                    └──< results       │                └──< result_submissions
                     └──< users ──< sessions                │
academic_sessions ──< semesters ───────────────────────────┘
users ──< audit_logs     role_permissions (role × permission)     grading_scale (score bands)`}</pre>
        </section>

        <section className="uemp-panel p-6">
          <h2 className="uemp-title">3. Authentication, RBAC & permission logic</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600 list-disc pl-5">
            <li>Passwords are salted and hashed with <strong>scrypt</strong>; verification uses a constant-time comparison. Plain-text passwords are never stored.</li>
            <li>Login creates a cryptographically random 256-bit token. Only its SHA-256 hash is stored in <code>sessions</code>; the cookie is HTTP-only, SameSite=Lax and expires after 7 days.</li>
            <li>Inactive, suspended, expired and unknown sessions are rejected by <code>getCurrentUser()</code>.</li>
            <li>Every protected layout calls <code>requireRole([...])</code>; every mutation calls <code>requireActionUser([...])</code> plus <code>requirePermission(...)</code>. Super Admin always retains full control.</li>
            <li>Department Admins are scoped by <code>users.departmentId</code>; cross-department writes are rejected even if IDs are tampered with.</li>
            <li>Lecturers may only open allocated courses. Submitted/approved results are locked; only a Department Admin can reopen approved results.</li>
            <li>Students may only see <code>results.status = 'approved'</code>; drafts, submitted and returned results remain invisible to them.</li>
            <li>Permissions are stored in <code>role_permissions</code> and editable by the Super Admin; changes take effect immediately in Server Actions.</li>
          </ul>
        </section>

        <section className="uemp-panel p-6">
          <h2 className="uemp-title">4. Grading scale & GPA</h2>
          <p className="mt-2 text-sm text-slate-600">CA = 0–30, Exam = 0–70, Total = 0–100. Inclusive bands are configurable by the Super Admin on the Grading Scale page.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="uemp-table" style={{ minWidth: 560 }}>
              <thead><tr><th>Score</th><th>Grade</th><th>Grade point</th><th>Remark</th></tr></thead>
              <tbody>
                {[["70–100", "A", "5", "Excellent"], ["60–69", "B", "4", "Very Good"], ["50–59", "C", "3", "Good"], ["45–49", "D", "2", "Credit"], ["40–44", "E", "1", "Pass"], ["0–39", "F", "0", "Fail"]].map((row) => (
                  <tr key={row[1]}><td className="strong">{row[0]}</td><td><Badge tone={row[1] === "F" ? "red" : "green"}>{row[1]}</Badge></td><td>{row[2]}</td><td>{row[3]}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">GPA = Σ(course credit units × grade point) ÷ Σ(course credit units). CGPA uses all approved results across every semester; first class ≥ 4.50, second class upper ≥ 3.50, second class lower ≥ 2.50, third class ≥ 1.50.</p>
        </section>

        <section className="uemp-panel p-6">
          <h2 className="uemp-title">5. Core workflows</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {[
              ["Course registration", "Student selects eligible current-semester courses → server verifies department/program/level/semester, duplicate registration and the 24-unit cap → registrations become visible to the student and department."],
              ["Result submission", "Lecturer opens an allocated course → enters CA/exam for the class list → saves drafts or submits complete scores → grades are computed server-side and locked."],
              ["Departmental approval", "Department Admin reviews a submitted course → approves (publishes to students) or returns with feedback → lecturer corrects and resubmits; approved results may be reopened with an audit entry."],
              ["Super Admin management", "Create faculties, departments, programs, sessions, semesters, courses, accounts and allocations; assign roles/departments, enable permissions, activate/suspend accounts and monitor university-wide reports and audit logs."],
            ].map(([title, text]) => <div key={title} className="rounded-xl border border-slate-200 p-4"><p className="text-sm font-bold text-slate-800">{title}</p><p className="mt-1 text-xs leading-relaxed text-slate-500">{text}</p></div>)}
          </div>
        </section>

        <section className="uemp-panel p-6">
          <h2 className="uemp-title">6. Test credentials & setup</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="uemp-table" style={{ minWidth: 560 }}>
              <thead><tr><th>Role</th><th>Email</th><th>Password</th></tr></thead>
              <tbody>{credentials.map((row) => <tr key={row[1]}><td className="strong">{row[0]}</td><td><code>{row[1]}</code></td><td><code>{row[2]}</code></td></tr>)}</tbody>
            </table>
          </div>
          <pre className="mt-5 overflow-x-auto rounded-xl bg-[#0b1f3a] p-4 text-[11px] leading-relaxed text-slate-200">{`# 1. Install dependencies
npm install
# 2. Configure .env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
# 3. Apply the Drizzle schema
npx drizzle-kit push
# 4. Start the app (sample data seeds automatically on /api/health, / or /login)
npm run dev
# 5. Production validation
npx next typegen && npm exec tsc -- --noEmit && npm run build && npm run start`}</pre>
          <p className="mt-3 text-sm text-slate-600">The seeded 2025/2026 First Semester includes approved CSC201 results, a CSC203 submission awaiting review, CSC205 draft scores, MTH201 returned for correction, multiple students/lecturers and complete audit history.</p>
        </section>

        <section className="uemp-panel p-6">
          <h2 className="uemp-title">7. Key decisions & trade-offs</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">Database-backed sessions were chosen over stateless JWTs so account suspension and logout invalidate access immediately. Server Actions remove a large public mutation API surface while keeping all authorization on the server. Course-level submission rows complement per-student result rows so reviewers approve a complete class list atomically. Denormalized department/session IDs on results and registrations simplify scoped reporting and authorization without sacrificing foreign-key integrity. The MVP intentionally excludes payments, accommodation, admissions and external integrations as specified.</p>
        </section>
      </main>
    </div>
  );
}
