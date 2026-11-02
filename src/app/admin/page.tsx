import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getCurrentTerm, getOverviewCounts, getSubmissions, getAuditTrail } from "@/lib/data";
import { getDepartmentBreakdown } from "@/lib/manage-data";
import { Badge, EmptyState, PageHeader, Panel, StatCard, StatusBadge, Table, formatDate } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const user = await requireRole(["super_admin"]);
  const term = await getCurrentTerm();
  const counts = await getOverviewCounts();
  const submissions = await getSubmissions();
  const audit = await getAuditTrail(undefined, 8);
  const departments = await getDepartmentBreakdown();
  const pending = submissions.filter((row) => row.status === "submitted");

  return (
    <>
      <PageHeader eyebrow="University-wide administration" title="University dashboard"
        description={`${user.fullName} · ${term.session.name} ${term.semester.name} · Full administrative oversight across all departments.`}
        actions={<><Link href="/admin/reports" className="uemp-btn uemp-btn-ghost">University reports</Link><Link href="/admin/users" className="uemp-btn uemp-btn-primary">Manage accounts</Link></>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="User accounts" value={counts.users} hint={`${counts.students} students · ${counts.lecturers} lecturers`} icon="◎" />
        <StatCard label="Faculties / Departments" value={`${counts.faculties} / ${counts.departments}`} hint={`${counts.programs} active programs`} icon="▦" tone="blue" />
        <StatCard label="Courses / Registrations" value={`${counts.courses} / ${counts.registrations}`} hint="Current catalogue & student records" icon="📚" tone="purple" />
        <StatCard label="Pending approvals" value={counts.pending_approvals} hint={`${counts.returned_results} returned · ${counts.approved_results} approved results`} icon="◷" tone="amber" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <Panel title="Departmental oversight" subtitle="Live counts across the university">
          <Table headers={["Department", "Faculty", "Students", "Lecturers", "Courses", "Registrations", "Pending"]}>
            {departments.map((row) => <tr key={row.department}><td className="strong">{row.department}</td><td>{row.faculty}</td><td>{row.students}</td><td>{row.lecturers}</td><td>{row.courses}</td><td>{row.registrations}</td><td>{row.pending ? <Badge tone="amber">{row.pending}</Badge> : 0}</td></tr>)}
          </Table>
        </Panel>
        <Panel title="Administration shortcuts">
          <div className="grid gap-2">
            {[
              ["/admin/structure", "Create faculties & departments", "▦"],
              ["/admin/sessions", "Manage sessions & semesters", "◷"],
              ["/admin/users", "Accounts, roles & status", "◎"],
              ["/admin/permissions", "Role permission matrix", "⚿"],
              ["/admin/courses", "Courses & allocations", "▤"],
              ["/admin/audit", "Monitor system activity", "◈"],
            ].map(([href, label, icon]) => <Link key={href} href={href} className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/50"><span className="text-lg text-emerald-700">{icon}</span>{label}<span className="ml-auto text-slate-400">→</span></Link>)}
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Departmental approvals being monitored" subtitle="Super Admin oversight only — approval remains with the authorized Department Admin"
          actions={<Link href="/admin/approvals" className="uemp-btn uemp-btn-ghost uemp-btn-sm">View all</Link>}>
          {pending.length ? <Table headers={["Course", "Department", "Lecturer", "Status", "Submitted"]}>
            {pending.slice(0, 6).map((row) => <tr key={row.id}><td className="strong">{row.code}</td><td>{row.department}</td><td>{row.lecturer}</td><td><StatusBadge status={row.status} /></td><td>{formatDate(row.submittedAt)}</td></tr>)}
          </Table> : <EmptyState title="No pending approvals" description="All submitted result sets have been reviewed." icon="✓" />}
        </Panel>
        <Panel title="System activity" actions={<Link href="/admin/audit" className="uemp-btn uemp-btn-ghost uemp-btn-sm">Full audit</Link>}>
          {audit.length ? <Table headers={["When", "Actor", "Action", "Entity"]}>
            {audit.map((log) => <tr key={log.id}><td>{formatDate(log.createdAt)}</td><td>{log.actorName ?? "System"}</td><td><Badge tone="blue">{log.action.replaceAll("_", " ")}</Badge></td><td>{log.entity}</td></tr>)}
          </Table> : <EmptyState title="No activity" description="System actions will be listed here." />}
        </Panel>
      </div>
    </>
  );
}
