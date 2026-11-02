import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getCurrentTerm, getLecturerContext, getLecturerCourses } from "@/lib/data";
import { Badge, EmptyState, PageHeader, Panel, StatusBadge, Table } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function LecturerCoursesPage() {
  const user = await requireRole(["lecturer"]);
  const lecturer = await getLecturerContext(user.id);
  if (!lecturer) return <Panel title="Profile missing"><p className="text-sm text-rose-600">No lecturer record found.</p></Panel>;
  const term = await getCurrentTerm();
  const courses = await getLecturerCourses(lecturer.lecturerId, term.session.id);

  return (
    <>
      <PageHeader eyebrow="Teaching responsibilities" title="Assigned courses & class lists"
        description="Course access is restricted to allocations linked to your lecturer profile and department." />
      <Panel title={`Course allocations · ${term.session.name}`} subtitle="Open a course to view its registered students, enter scores and check submission status">
        {courses.length ? (
          <Table headers={["Code", "Course title", "Units", "Level", "Semester", "Students", "Average", "Passes", "Status", "Action"]} minWidth={960}>
            {courses.map((course) => (
              <tr key={course.id}>
                <td className="strong">{course.code}</td><td>{course.title}</td><td>{course.units}</td><td>{course.level}</td>
                <td>{course.semester_name}</td><td>{course.student_count}</td>
                <td>{course.average_score === null ? "—" : course.average_score}</td>
                <td>{course.pass_count} / {course.student_count}</td>
                <td><StatusBadge status={course.submission_status} /></td>
                <td><Link href={`/lecturer/courses/${course.id}`} className="uemp-btn uemp-btn-primary uemp-btn-sm">Manage</Link></td>
              </tr>
            ))}
          </Table>
        ) : <EmptyState title="No assigned courses" description="Your Department Admin must allocate courses before you can enter results." />}
        <div className="mt-5 flex flex-wrap gap-3 text-xs text-slate-500">
          <Badge tone="amber">Draft: editable</Badge><Badge tone="blue">Submitted: locked</Badge>
          <Badge tone="red">Returned: corrections requested</Badge><Badge tone="green">Approved: published</Badge>
        </div>
      </Panel>
    </>
  );
}
