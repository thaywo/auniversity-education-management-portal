import Link from "next/link";
import { getDepartmentContext } from "@/lib/dept";
import { getCurrentTerm, getDepartmentCounts, getSubmissions, getAuditTrail } from "@/lib/data";
import { Badge, EmptyState, PageHeader, Panel, StatCard, StatusBadge, Table, formatDate } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DepartmentDashboard() {
  const { user, departmentId, department } = await getDepartmentContext();
  const term = await getCurrentTerm();
  const counts = await getDepartmentCounts(departmentId);
  const submissions = await getSubmissions(departmentId);
  const pending = submissions.filter((item) => item.status === "submitted");
  const returned = submissions.filter((item) => item.status === "returned");
  const audit = await getAuditTrail(departmentId, 6);

  return (
    <>
      <PageHeader eyebrow="Department administration" title={`${department} dashboard`}
        description={`${user.fullName} · ${term.session.name} ${term.semester.name} · Your access is limited to this department.`}
        actions={<><Link href="/department/results" className="uemp-btn uemp-btn-ghost">Review submissions</Link><Link href="/department/students" className="uemp-btn uemp-btn-primary">Register student</Link></>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Students" value={counts.students} hint="Registered in department" icon="◎" />
        <StatCard label="Lecturers" value={counts.lecturers} hint="Teaching profiles" icon="◍" tone="blue" />
        <StatCard label="Active courses" value={counts.courses} hint="Departmental catalogue" icon="📚" tone="purple" />
        <StatCard label="Course registrations" value={counts.registrations} hint="All recorded terms" icon="▤" />
        <StatCard label="Pending approvals" value={counts.pending_approvals} hint="Awaiting your review" icon="◷" tone="amber" />
        <StatCard label="Approved result sets" value={counts.approved_results} hint="Published to students" icon="✓" tone="green" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Result submissions needing attention" subtitle="Only submitted results from this department can be approved"
          actions={<Link href="/department/results" className="uemp-btn uemp-btn-ghost uemp-btn-sm">All submissions</Link>}>
          {pending.length || returned.length ? (
            <Table headers={["Course", "Lecturer", "Semester", "Status", "Submitted", "Action"]}>
              {[...pending, ...returned].map((item) => (
                <tr key={item.id}>
                  <td className="strong">{item.code}<span className="ml-2 font-normal text-slate-500">{item.title}</span></td>
                  <td>{item.lecturer}</td><td>{item.semester}</td><td><StatusBadge status={item.status} /></td>
                  <td>{formatDate(item.submittedAt)}</td>
                  <td><Link href={`/department/results/${item.id}`} className="uemp-btn uemp-btn-primary uemp-btn-sm">Review</Link></td>
                </tr>
              ))}
            </Table>
          ) : <EmptyState title="No pending submissions" description="Lecturer submissions for your department will appear here." icon="✓" />}
        </Panel>
        <Panel title="Quick management">
          <div className="grid gap-2">
            {[
              ["/department/students", "Register / manage students", "◎"],
              ["/department/lecturers", "Create lecturer profiles", "◍"],
              ["/department/courses", "Manage departmental courses", "▤"],
              ["/department/allocations", "Assign lecturers to courses", "⇄"],
              ["/department/programs", "Programs & academic levels", "▣"],
              ["/department/reports", "Generate departmental reports", "◈"],
            ].map(([href, label, icon]) => (
              <Link key={href} href={href} className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/50">
                <span className="text-lg text-emerald-700">{icon}</span>{label}<span className="ml-auto text-slate-400">→</span>
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Recent departmental activity" className="mt-6" actions={<Link href="/department/audit" className="uemp-btn uemp-btn-ghost uemp-btn-sm">Full audit trail</Link>}>
        {audit.length ? (
          <Table headers={["When", "Actor", "Action", "Entity", "Details"]}>
            {audit.map((row) => <tr key={row.id}><td>{formatDate(row.createdAt)}</td><td>{row.actorName ?? "System"}</td><td><Badge tone="blue">{row.action.replaceAll("_", " ")}</Badge></td><td>{row.entity}</td><td className="max-w-xs truncate text-xs">{JSON.stringify(row.details)}</td></tr>)}
          </Table>
        ) : <EmptyState title="No recent activity" description="Administrative actions will be logged here." icon="◷" />}
      </Panel>
    </>
  );
}
