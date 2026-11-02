import Link from "next/link";
import { Badge } from "@/components/ui";

export const metadata = { title: "Technical Documentation | UEMP" };

const tables = [
  ["faculties, departments", "University organizational structure; departments belong to faculties with unique codes and cascade references."],
  ["programs, academic_levels", "Degree programs and active academic levels (100L–500L), scoped to departments via foreign keys."],
  ["academic_sessions, semesters", "Academic session and term definitions with unique current-session and semester flags."],
  ["users, sessions", "Identity management (role, status, department) and SHA-256 hashed, expiring session tokens (InnoDB cascade delete)."],
  ["students", "Matriculation number, department, program, level, admission year and contact details."],
  ["lecturers", "Staff number, department, academic designation and qualifications."],
  ["courses, course_allocations", "Course catalogue (code, title, units, level, semester) and lecturer allocations with unique term constraints."],
  ["registrations", "Student ↔ course for a session/semester, enforced with a composite unique key preventing duplicate enrollment."],
  ["results", "CA (30), exam (70), total (100), letter grade, grade point, status and approval metadata; one row per registration."],
  ["result_submissions", "Course-level submission lifecycle (draft → submitted → approved → returned) with departmental feedback."],
  ["grading_scale", "Configurable inclusive score bands and grade points (5.00 CGPA scale) stored in MySQL."],
  ["role_permissions", "Persistent RBAC matrix; Super Admin can dynamically enable or disable permissions in real-time."],
  ["audit_logs", "Immutable audit trail: actor, action, target entity, timestamp, department, and JSON structured details."],
  ["app_meta", "Idempotent bootstrap marker in MySQL used for safe, automatic sample data seeding."],
];

const credentials = [
  { role: "Super Admin", email: "super@uemp.edu", pass: "Admin@123", scope: "University-wide Administration" },
  { role: "Department Admin", email: "cs.admin@uemp.edu", pass: "Admin@123", scope: "Computer Science Dept" },
  { role: "Lecturer", email: "okafor@uemp.edu", pass: "Lecturer@123", scope: "Assigned Courses (CSC201, CSC203)" },
  { role: "Student", email: "amina@uemp.edu", pass: "Student@123", scope: "200L Computer Science" },
];

export default function DocumentationPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#07172c] text-sm font-black text-emerald-400">U</span>
            <span className="text-sm font-extrabold text-slate-900">UEMP Documentation</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs font-semibold text-slate-600 hover:text-emerald-700">← Overview</Link>
            <Link href="/login" className="uemp-btn uemp-btn-primary uemp-btn-sm">Sign in</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-5 py-10 sm:px-8">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.16em] text-emerald-700">Lead Web Praxis Media Limited</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">UEMP Technical Documentation</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            System architecture, MySQL database design, RBAC security model, business rules, and setup instructions for the University Education Management Portal (UEMP).
          </p>
        </div>

        {/* Section 1 */}
        <section className="uemp-panel p-6">
          <h2 className="uemp-title">1. Technology Stack & Architecture</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Next.js 16 (App Router)", "React 19, Server Components, Route Handlers & Server Actions"],
              ["MySQL 8.0+ (InnoDB)", "ACID transactions, foreign keys, JSON types & UTF8MB4 charset"],
              ["Drizzle ORM (mysql2)", "Type-safe relational schema, connection pooling & zero-overhead queries"],
              ["Tailwind CSS 4", "Responsive mobile-first styling, print layouts & accessible components"],
            ].map(([title, text]) => (
              <div key={title} className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-4">
                <p className="text-sm font-bold text-slate-900">{title}</p>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            The application follows a <strong>server-first, zero-trust architecture</strong>. 
            Pages are rendered on the server only after verifying the user&apos;s cryptographic session token in the MySQL database. 
            All state mutations pass through Next.js Server Actions, where user identity, active status, role permission, and departmental scope are independently verified. 
            Direct endpoint tampering, forged parameters, or ID manipulation are prevented server-side.
          </p>
        </section>

        {/* Section 2 */}
        <section className="uemp-panel p-6">
          <h2 className="uemp-title">2. Database Structure & Entity Relationship (ER) Model</h2>
          <p className="uemp-subtitle mt-1">
            Built on MySQL 8.0+ using the InnoDB storage engine with cascading foreign keys, unique composite indexes, and strict data typing.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="uemp-table" style={{ minWidth: 640 }}>
              <thead><tr><th>MySQL Table(s)</th><th>Purpose & Relational Constraints</th></tr></thead>
              <tbody>
                {tables.map(([name, purpose]) => (
                  <tr key={name}>
                    <td className="strong"><code className="bg-slate-100 px-2 py-0.5 rounded text-xs text-emerald-800">{name}</code></td>
                    <td className="text-slate-600">{purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5">
            <p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500 mb-2">Relational Schema Flow</p>
            <pre className="overflow-x-auto rounded-xl bg-[#07172c] p-4 text-[11px] leading-relaxed text-emerald-300 font-mono">{`faculties ──< departments ──< programs
           │             └──< academic_levels
           ├──< students ──< registrations >── courses ──< course_allocations >── lecturers
           │                    │                  │                │
           │                    └──< results       │                └──< result_submissions
           └──< users ──< sessions                │
academic_sessions ──< semesters ───────────────────┘
users ──< audit_logs     role_permissions (role × permission)     grading_scale (score bands)`}</pre>
          </div>
        </section>

        {/* Section 3 */}
        <section className="uemp-panel p-6">
          <h2 className="uemp-title">3. Authentication, RBAC & Security Logic</h2>
          <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-slate-600 list-disc pl-5">
            <li><strong>Password Storage:</strong> Passwords are cryptographically salted and hashed using Node.js native <code>crypto.scrypt</code>. Authentication uses constant-time comparison to prevent timing attacks.</li>
            <li><strong>Session Management:</strong> Successful login generates a cryptographically random 256-bit token. Only its SHA-256 hash is persisted in the MySQL <code>sessions</code> table. Cookies are flagged <code>HttpOnly</code>, <code>SameSite=Lax</code>, and <code>Secure</code> in production.</li>
            <li><strong>Session Invalidation:</strong> Suspended, deactivated, or expired accounts are rejected instantly on subsequent requests because session state is verified in MySQL.</li>
            <li><strong>Departmental Scoping:</strong> Department Admins are bound to their assigned <code>departmentId</code>. Any attempt to query, approve, or allocate courses outside their department is rejected by the server.</li>
            <li><strong>Workflow Lockouts:</strong> Lecturers can only edit courses assigned to them. Once scores are submitted for approval, the sheet is locked. Only a Department Admin can approve or return for correction.</li>
            <li><strong>Student Isolation:</strong> Students can only view results that have reached <code>status = 'approved'</code>. Interim drafts, unmoderated submissions, and returned sheets are completely hidden.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="uemp-panel p-6">
          <h2 className="uemp-title">4. Grading Scale & CGPA Computation Engine</h2>
          <p className="mt-1 text-sm text-slate-600">
            Standard Nigerian university 5.00 GPA grading bands stored in MySQL (fully configurable by Super Admin):
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="uemp-table" style={{ minWidth: 560 }}>
              <thead><tr><th>Score Band</th><th>Letter Grade</th><th>Grade Point</th><th>Remark</th></tr></thead>
              <tbody>
                {[
                  ["70 – 100", "A", "5", "Excellent"],
                  ["60 – 69", "B", "4", "Very Good"],
                  ["50 – 59", "C", "3", "Good"],
                  ["45 – 49", "D", "2", "Credit"],
                  ["40 – 44", "E", "1", "Pass"],
                  ["0 – 39", "F", "0", "Fail"],
                ].map((row) => (
                  <tr key={row[1]}>
                    <td className="strong">{row[0]}</td>
                    <td><Badge tone={row[1] === "F" ? "red" : "green"}>{row[1]}</Badge></td>
                    <td className="font-semibold">{row[2]}</td>
                    <td>{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs leading-relaxed text-emerald-950 font-medium">
            <p className="font-bold text-emerald-900 text-sm mb-1">Standard Credit-Weighted GPA Formula:</p>
            <p><strong>Semester GPA</strong> = Σ(Course Credit Units × Grade Point) ÷ Σ(Course Credit Units for the term).</p>
            <p className="mt-1"><strong>Cumulative GPA (CGPA)</strong> = Total weighted points across all approved semesters ÷ Total registered units across all approved semesters.</p>
            <p className="mt-1">Classifications: First Class (≥ 4.50), Second Class Upper (3.50–4.49), Second Class Lower (2.50–3.49), Third Class (1.50–2.49), Fail (&lt; 1.50).</p>
          </div>
        </section>

        {/* Section 5 */}
        <section className="uemp-panel p-6">
          <h2 className="uemp-title">5. Core Workflows Implementation</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {[
              ["Workflow 1: Course Registration", "Student selects eligible courses for their department, program, level, and semester. MySQL compound unique index (student_id, course_id, session_id, semester_id) prevents duplicates, and the server enforces a maximum cap of 24 credit units."],
              ["Workflow 2: Lecturer Score Submission", "Lecturer opens an assigned course roster, enters CA (0–30) and Exam (0–70) scores. System computes total and grade points. Scores can be saved as drafts or submitted for departmental review, which locks the result sheet."],
              ["Workflow 3: Departmental Result Approval", "Department Admin reviews submitted class rosters. Admin can approve (immediately publishing results and updating student CGPA) or return with remarks (unlocking the sheet and notifying the lecturer)."],
              ["Workflow 4: Super Admin University Oversight", "Super Admin manages organizational units (faculties/departments), programs, sessions, semesters, grading scales, account activations/suspensions, and monitors university-wide audit logs and reports."],
            ].map(([title, text]) => (
              <div key={title} className="rounded-xl border border-slate-200 p-4 bg-white">
                <p className="text-sm font-bold text-slate-900">{title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 6 */}
        <section className="uemp-panel p-6">
          <h2 className="uemp-title">6. MySQL Setup & Demonstration Credentials</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="uemp-table" style={{ minWidth: 600 }}>
              <thead><tr><th>Role</th><th>Email</th><th>Password</th><th>Scope</th></tr></thead>
              <tbody>
                {credentials.map((row) => (
                  <tr key={row.email}>
                    <td className="strong">{row.role}</td>
                    <td><code className="bg-slate-100 px-2 py-0.5 rounded text-xs">{row.email}</code></td>
                    <td><code className="bg-slate-100 px-2 py-0.5 rounded text-xs text-emerald-800">{row.pass}</code></td>
                    <td className="text-xs text-slate-500">{row.scope}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5">
            <p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500 mb-2">MySQL Setup Commands</p>
            <pre className="overflow-x-auto rounded-xl bg-[#07172c] p-4 text-[11px] leading-relaxed text-slate-200 font-mono">{`# 1. Install dependencies
npm install

# 2. Configure .env with your MySQL connection string
DATABASE_URL="mysql://root:password@127.0.0.1:3306/auniversity_portal"

# 3. Apply schema to MySQL database via Drizzle Kit
npx drizzle-kit push

# 4. Start the application
npm run dev

# 5. Production Build Verification
npm run typecheck && npm run build && npm run start`}</pre>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            *Sample data automatically seeds on first load with registered courses, draft scores, a pending submission, an approved CSC201 result sheet, a returned submission, and full audit logs.
          </p>
        </section>

        {/* Section 7 */}
        <section className="uemp-panel p-6">
          <h2 className="uemp-title">7. Architectural Decisions & Trade-Offs</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600 list-disc pl-5">
            <li><strong>MySQL with InnoDB:</strong> Chosen for robust foreign-key integrity, ACID transaction support, row-level locking, and high concurrency on relational joins.</li>
            <li><strong>Database-Backed Sessions vs Stateless JWTs:</strong> Stateful session tokens in MySQL allow administrators to revoke sessions, deactivate accounts, or suspend users with immediate effect across all devices.</li>
            <li><strong>Server Actions over REST Endpoints:</strong> Encapsulates business logic directly inside the server execution boundary, removing large public API endpoints while maintaining 100% server-side validation.</li>
            <li><strong>Atomic Course-Level Submissions:</strong> Course results are grouped under a <code>result_submissions</code> record, enabling departmental reviewers to moderate and approve an entire course roster atomically rather than individual student records one by one.</li>
            <li><strong>Zero External Integrations:</strong> In strict compliance with Section 9 of the assessment brief, external payment gateways, SMS integrations, and biometric scanners were intentionally omitted to maintain focus on core academic workflows.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
