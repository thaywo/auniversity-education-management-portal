import { getDepartmentContext } from "@/lib/dept";
import { getRegistrationReport, getCourseRegistrationCounts } from "@/lib/manage-data";
import { EmptyState, PageHeader, Panel, Table, formatDate } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DepartmentRegistrationsPage() {
  const { departmentId, department } = await getDepartmentContext();
  const registrations = await getRegistrationReport(departmentId);
  const counts = await getCourseRegistrationCounts(departmentId);

  return (
    <>
      <PageHeader eyebrow={`${department} · Monitoring`} title="Student course registrations"
        description="View every registration made by students in your department, with course, term and timestamp."
        actions={<a href="/api/exports?type=registrations" className="uemp-btn uemp-btn-ghost">Download CSV report</a>} />
      <Panel title="Registrations by course" className="mb-6">
        {counts.length ? <Table headers={["Course", "Title", "Units", "Registrations"]}>
          {counts.map((row) => <tr key={row.course_code}><td className="strong">{row.course_code}</td><td>{row.course_title}</td><td>{row.units}</td><td>{row.registrations}</td></tr>)}
        </Table> : <EmptyState title="No courses" description="Create courses to monitor registrations." />}
      </Panel>
      <Panel title={`Detailed registration records (${registrations.length})`}>
        {registrations.length ? <Table headers={["Matric number", "Student", "Code", "Course", "Units", "Level", "Term", "Registered"]} minWidth={950}>
          {registrations.map((row) => <tr key={row.id}><td className="strong">{row.matric_number}</td><td>{row.student}</td><td>{row.course_code}</td><td>{row.course_title}</td><td>{row.units}</td><td>{row.level}</td><td>{row.session} · {row.semester}</td><td>{formatDate(row.registered_at)}</td></tr>)}
        </Table> : <EmptyState title="No registrations" description="Student registrations will appear here." />}
      </Panel>
    </>
  );
}
