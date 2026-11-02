import { assignLecturer } from "@/app/actions";
import { requireRole } from "@/lib/auth";
import { getAllocations, getCourses, getLecturerList } from "@/lib/manage-data";
import { ActionForm } from "@/components/forms";
import { EmptyState, PageHeader, Panel, Table } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminAllocationsPage() {
  await requireRole(["super_admin"]);
  const [allocations, courses, lecturers] = await Promise.all([getAllocations(), getCourses(), getLecturerList()]);

  return (
    <>
      <PageHeader eyebrow="Teaching assignments" title="Course allocations"
        description="Assign lecturers to courses across every department. The server rejects allocations where the lecturer and course belong to different departments." />
      <Panel title="Assign / reallocate course" className="mb-6">
        <ActionForm action={assignLecturer} submitLabel="Save allocation" fields={[
          { name: "courseId", label: "Course", type: "select", required: true, options: courses.map((course) => ({ value: course.id, label: `${course.department} · ${course.code} — ${course.title} (${course.session})` })) },
          { name: "lecturerId", label: "Lecturer", type: "select", required: true, options: lecturers.map((lecturer) => ({ value: lecturer.id, label: `${lecturer.department} · ${lecturer.fullName}` })) },
        ]} />
      </Panel>
      <Panel title={`University allocations (${allocations.length})`}>
        {allocations.length ? <Table headers={["Department", "Course", "Title", "Units", "Lecturer", "Staff number", "Session", "Semester"]} minWidth={950}>
          {allocations.map((allocation) => <tr key={allocation.id}><td>{allocation.department}</td><td className="strong">{allocation.code}</td><td>{allocation.title}</td><td>{allocation.units}</td><td>{allocation.lecturer}</td><td>{allocation.staffNumber}</td><td>{allocation.session}</td><td>{allocation.semester}</td></tr>)}
        </Table> : <EmptyState title="No allocations" />}
      </Panel>
    </>
  );
}
