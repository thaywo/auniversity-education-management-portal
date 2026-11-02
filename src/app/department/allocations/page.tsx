import { assignLecturer } from "@/app/actions";
import { getDepartmentContext } from "@/lib/dept";
import { getAllocations, getCourses, getLecturerList } from "@/lib/manage-data";
import { ActionForm } from "@/components/forms";
import { EmptyState, PageHeader, Panel, Table } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DepartmentAllocationsPage() {
  const { departmentId, department } = await getDepartmentContext();
  const [allocations, courses, lecturers] = await Promise.all([
    getAllocations(departmentId), getCourses(departmentId), getLecturerList(departmentId),
  ]);

  return (
    <>
      <PageHeader eyebrow={`${department} · Teaching assignments`} title="Course allocations"
        description="Assign one lecturer to each course per academic session. Only allocated courses appear in that lecturer's workspace." />
      <Panel title="Assign / reallocate a lecturer" className="mb-6">
        <ActionForm action={assignLecturer} submitLabel="Save allocation" fields={[
          { name: "courseId", label: "Course", type: "select", required: true, options: courses.map((course) => ({ value: course.id, label: `${course.code} — ${course.title} (${course.session})` })) },
          { name: "lecturerId", label: "Lecturer", type: "select", required: true, options: lecturers.map((lecturer) => ({ value: lecturer.id, label: `${lecturer.fullName} · ${lecturer.staffNumber}` })) },
        ]} description="Reassigning an existing course allocation updates the current lecturer for that session. The change is audited." />
      </Panel>
      <Panel title={`Current allocations (${allocations.length})`}>
        {allocations.length ? (
          <Table headers={["Course", "Title", "Units", "Lecturer", "Staff number", "Session", "Semester"]} minWidth={850}>
            {allocations.map((allocation) => <tr key={allocation.id}><td className="strong">{allocation.code}</td><td>{allocation.title}</td><td>{allocation.units}</td><td>{allocation.lecturer}</td><td>{allocation.staffNumber}</td><td>{allocation.session}</td><td>{allocation.semester}</td></tr>)}
          </Table>
        ) : <EmptyState title="No allocations" description="Assign lecturers using the form above." />}
      </Panel>
    </>
  );
}
