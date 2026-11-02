import { createCourse, toggleCourse } from "@/app/actions";
import { getDepartmentContext } from "@/lib/dept";
import { getCurrentTerm } from "@/lib/data";
import { getCourses, getPrograms, getLevels, getSessions, getSemesters } from "@/lib/manage-data";
import { ActionForm, RowForm } from "@/components/forms";
import { EmptyState, PageHeader, Panel, StatusBadge, Table } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DepartmentCoursesPage() {
  const { departmentId, department } = await getDepartmentContext();
  const term = await getCurrentTerm();
  const [courses, programs, levels, sessions, semesters] = await Promise.all([
    getCourses(departmentId), getPrograms(departmentId), getLevels(departmentId), getSessions(), getSemesters(),
  ]);

  return (
    <>
      <PageHeader eyebrow={`${department} · Course management`} title="Departmental courses"
        description="Create courses with codes, titles, credit units, levels, programs and semester allocation. Duplicate codes per term are rejected." />
      <Panel title="Create a course" className="mb-6">
        <ActionForm action={createCourse} submitLabel="Create course" fields={[
          { name: "code", label: "Course code", required: true, placeholder: "CSC301" },
          { name: "title", label: "Course title", required: true, placeholder: "Software Engineering" },
          { name: "units", label: "Credit units", type: "number", required: true, min: 1, max: 6, defaultValue: 3 },
          { name: "level", label: "Level", type: "select", required: true, options: levels.map((level) => ({ value: level.level, label: level.name })) },
          { name: "programId", label: "Program (blank = all programs)", type: "select", options: programs.map((program) => ({ value: program.id, label: program.name })) },
          { name: "sessionId", label: "Academic session", type: "select", required: true, defaultValue: term.session.id, options: sessions.map((session) => ({ value: session.id, label: session.name })) },
          { name: "semesterId", label: "Semester", type: "select", required: true, defaultValue: term.semester.id, options: semesters.map((semester) => ({ value: semester.id, label: `${semester.session} · ${semester.name}` })) },
        ]} />
      </Panel>
      <Panel title={`Course catalogue (${courses.length})`} subtitle="Inactive courses are hidden from student registration">
        {courses.length ? (
          <Table headers={["Code", "Course title", "Units", "Level", "Program", "Semester", "Session", "Lecturer", "Status", "Action"]} minWidth={1050}>
            {courses.map((course) => (
              <tr key={course.id}>
                <td className="strong">{course.code}</td><td>{course.title}</td><td>{course.units}</td><td>{course.level}</td>
                <td>{course.program ?? "All programs"}</td><td>{course.semester}</td><td>{course.session}</td>
                <td>{course.lecturer ?? "Unallocated"}</td><td><StatusBadge status={course.isActive ? "active" : "inactive"} /></td>
                <td><RowForm action={toggleCourse} hidden={{ id: course.id }} label={course.isActive ? "Deactivate" : "Activate"} tone={course.isActive ? "danger" : "primary"} /></td>
              </tr>
            ))}
          </Table>
        ) : <EmptyState title="No courses yet" description="Create the first departmental course above." />}
      </Panel>
    </>
  );
}
