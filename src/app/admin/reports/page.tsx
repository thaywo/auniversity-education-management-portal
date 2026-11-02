import { requireRole } from "@/lib/auth";
import { getCurrentTerm, getOverviewCounts } from "@/lib/data";
import { getDepartmentBreakdown, getPerformanceReport, getCourseRegistrationCounts } from "@/lib/manage-data";
import { PrintButton } from "@/components/forms";
import { Badge, EmptyState, PageHeader, Panel, ProgressBar, StatCard, Table } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  await requireRole(["super_admin"]);
  const term = await getCurrentTerm();
  const [counts, departments, performance, registrationCounts] = await Promise.all([
    getOverviewCounts(), getDepartmentBreakdown(), getPerformanceReport(), getCourseRegistrationCounts(),
  ]);
  const maxStudents = Math.max(...departments.map((row) => row.students), 1);

  return (
    <>
      <PageHeader eyebrow="University-wide reporting" title="Academic & administrative reports"
        description={`Institutional reports for ${term.session.name}. Student lists, registration reports and performance summaries can be exported as CSV.`}
        actions={<><a href="/api/exports?type=students" className="uemp-btn uemp-btn-ghost">Students CSV</a><a href="/api/exports?type=registrations" className="uemp-btn uemp-btn-ghost">Registrations CSV</a><a href="/api/exports?type=performance" className="uemp-btn uemp-btn-ghost">Performance CSV</a><a href="/api/exports?type=users" className="uemp-btn uemp-btn-ghost">Accounts CSV</a><PrintButton /></>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Students" value={counts.students} icon="◎" />
        <StatCard label="Lecturers" value={counts.lecturers} icon="◍" tone="blue" />
        <StatCard label="Courses" value={counts.courses} icon="📚" tone="purple" />
        <StatCard label="Approved results" value={counts.approved_results} icon="✓" tone="green" />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Departmental student distribution">
          {departments.length ? <div className="space-y-4">{departments.map((row) => <div key={row.department}><div className="mb-1 flex justify-between text-sm font-semibold text-slate-700"><span>{row.department}</span><span>{row.students} students</span></div><ProgressBar value={row.students} max={maxStudents} /></div>)}</div> : <EmptyState title="No departments" />}
        </Panel>
        <Panel title="Institutional summary">
          <Table headers={["Metric", "Value"]}>
            <tr><td>Faculties</td><td className="strong">{counts.faculties}</td></tr>
            <tr><td>Departments</td><td className="strong">{counts.departments}</td></tr>
            <tr><td>Programs</td><td className="strong">{counts.programs}</td></tr>
            <tr><td>Total user accounts</td><td className="strong">{counts.users}</td></tr>
            <tr><td>Course registrations</td><td className="strong">{counts.registrations}</td></tr>
            <tr><td>Pending departmental approvals</td><td className="strong">{counts.pending_approvals}</td></tr>
            <tr><td>Returned result sets</td><td className="strong">{counts.returned_results}</td></tr>
          </Table>
        </Panel>
      </div>
      <Panel title="Academic performance by course" className="mt-6">
        {performance.length ? <Table headers={["Department", "Code", "Course", "Term", "Approved", "Average", "Pass", "Fail", "Pass rate"]} minWidth={1000}>
          {performance.map((row) => <tr key={`${row.department}-${row.course_code}-${row.session}-${row.semester}`}><td>{row.department}</td><td className="strong">{row.course_code}</td><td>{row.course_title}</td><td>{row.session} · {row.semester}</td><td>{row.approved}</td><td>{row.average}</td><td>{row.passes}</td><td>{row.fails}</td><td><Badge tone={row.pass_rate >= 60 ? "green" : "amber"}>{row.pass_rate}%</Badge></td></tr>)}
        </Table> : <EmptyState title="No approved results" description="Performance reports appear after departmental approval." />}
      </Panel>
      <Panel title="Course registration popularity" className="mt-6">
        {registrationCounts.length ? <Table headers={["Department", "Course", "Units", "Registrations"]}>
          {registrationCounts.slice(0, 20).map((row) => <tr key={`${row.department}-${row.course_code}`}><td>{row.department}</td><td className="strong">{row.course_code} · {row.course_title}</td><td>{row.units}</td><td>{row.registrations}</td></tr>)}
        </Table> : <EmptyState title="No registrations" />}
      </Panel>
    </>
  );
}
