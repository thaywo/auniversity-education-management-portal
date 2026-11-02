import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getRegistrationReport, getCourseRegistrationCounts, getDepartments } from "@/lib/manage-data";
import { Badge, EmptyState, PageHeader, Panel, Table, formatDate } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminRegistrationsPage({ searchParams }: { searchParams: Promise<{ departmentId?: string }> }) {
  await requireRole(["super_admin"]);
  const { departmentId: raw } = await searchParams;
  const departmentId = Number(raw) || undefined;
  const [registrations, counts, departments] = await Promise.all([
    getRegistrationReport(departmentId), getCourseRegistrationCounts(departmentId), getDepartments(),
  ]);
  const total = counts.reduce((sum, row) => sum + row.registrations, 0);

  return (
    <>
      <PageHeader eyebrow="University-wide monitoring" title="Course registrations"
        description={`Monitor ${total} student course registrations across all departments. Filter by department for focused oversight.`}
        actions={<a href={`/api/exports?type=registrations${departmentId ? `&departmentId=${departmentId}` : ""}`} className="uemp-btn uemp-btn-ghost">Download CSV</a>} />
      <div className="no-print mb-5 flex flex-wrap gap-2">
        <Link href="/admin/registrations" className={`uemp-btn uemp-btn-sm ${!departmentId ? "uemp-btn-primary" : "uemp-btn-ghost"}`}>All departments</Link>
        {departments.map((department) => <Link key={department.id} href={`/admin/registrations?departmentId=${department.id}`} className={`uemp-btn uemp-btn-sm ${departmentId === department.id ? "uemp-btn-primary" : "uemp-btn-ghost"}`}>{department.code}</Link>)}
      </div>
      <Panel title="Registrations by course" className="mb-6">
        {counts.length ? <Table headers={["Department", "Code", "Course", "Units", "Registrations"]}>
          {counts.map((row) => <tr key={`${row.department}-${row.course_code}`}><td>{row.department}</td><td className="strong">{row.course_code}</td><td>{row.course_title}</td><td>{row.units}</td><td><Badge tone="blue">{row.registrations}</Badge></td></tr>)}
        </Table> : <EmptyState title="No course registrations" />}
      </Panel>
      <Panel title={`Registration records (${registrations.length})`}>
        {registrations.length ? <Table headers={["Matric number", "Student", "Department", "Course", "Units", "Level", "Term", "Registered"]} minWidth={1000}>
          {registrations.map((row) => <tr key={row.id}><td className="strong">{row.matric_number}</td><td>{row.student}</td><td>{row.department}</td><td>{row.course_code} · {row.course_title}</td><td>{row.units}</td><td>{row.level}</td><td>{row.session} · {row.semester}</td><td>{formatDate(row.registered_at)}</td></tr>)}
        </Table> : <EmptyState title="No registrations found" description="Try a different department filter." />}
      </Panel>
    </>
  );
}
