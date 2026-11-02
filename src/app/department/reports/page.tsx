import { getDepartmentContext } from "@/lib/dept";
import { getDepartmentCounts, getCurrentTerm } from "@/lib/data";
import { getStudents, getPerformanceReport, getCourseRegistrationCounts } from "@/lib/manage-data";
import { PrintButton } from "@/components/forms";
import { Badge, EmptyState, PageHeader, Panel, ProgressBar, StatCard, Table } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DepartmentReportsPage() {
  const { departmentId, department } = await getDepartmentContext();
  const term = await getCurrentTerm();
  const [counts, students, performance, registrationCounts] = await Promise.all([
    getDepartmentCounts(departmentId), getStudents(departmentId),
    getPerformanceReport(departmentId), getCourseRegistrationCounts(departmentId),
  ]);
  const totalRegistrations = registrationCounts.reduce((sum, row) => sum + row.registrations, 0);

  return (
    <>
      <PageHeader eyebrow={`${department} · Reports`} title="Departmental reports"
        description={`Generated reports for ${term.session.name}. All exports are scoped to your department.`}
        actions={<><a href="/api/exports?type=students" className="uemp-btn uemp-btn-ghost">Student CSV</a><a href="/api/exports?type=registrations" className="uemp-btn uemp-btn-ghost">Registration CSV</a><a href="/api/exports?type=performance" className="uemp-btn uemp-btn-ghost">Performance CSV</a><PrintButton /></>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Students" value={counts.students} icon="◎" />
        <StatCard label="Course registrations" value={totalRegistrations} icon="▤" tone="blue" />
        <StatCard label="Approved result sets" value={counts.approved_results} icon="✓" tone="green" />
        <StatCard label="Pending approvals" value={counts.pending_approvals} icon="◷" tone="amber" />
      </div>
      <Panel title="Academic performance by course" className="mb-6">
        {performance.length ? <Table headers={["Code", "Course", "Term", "Approved", "Average", "Pass", "Fail", "Pass rate"]} minWidth={900}>
          {performance.map((row) => <tr key={`${row.course_code}-${row.session}-${row.semester}`}><td className="strong">{row.course_code}</td><td>{row.course_title}</td><td>{row.session} · {row.semester}</td><td>{row.approved}</td><td>{row.average}</td><td>{row.passes}</td><td>{row.fails}</td><td><Badge tone={row.pass_rate >= 60 ? "green" : "amber"}>{row.pass_rate}%</Badge></td></tr>)}
        </Table> : <EmptyState title="No approved results" description="Performance reports appear after departmental approval." />}
      </Panel>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Student list summary">
          {students.length ? <Table headers={["Matric number", "Name", "Program", "Level"]}>{students.slice(0, 15).map((student) => <tr key={student.id}><td className="strong">{student.matricNumber}</td><td>{student.fullName}</td><td>{student.program}</td><td>{student.level}</td></tr>)}</Table> : <EmptyState title="No students" />}
        </Panel>
        <Panel title="Registration distribution">
          {registrationCounts.length ? <div className="space-y-4">{registrationCounts.slice(0, 8).map((row) => <div key={row.course_code}><div className="mb-1 flex justify-between text-sm font-semibold text-slate-700"><span>{row.course_code}</span><span>{row.registrations}</span></div><ProgressBar value={row.registrations} max={Math.max(...registrationCounts.map((item) => item.registrations), 1)} /></div>)}</div> : <EmptyState title="No registration data" />}
        </Panel>
      </div>
    </>
  );
}
