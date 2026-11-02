import { createCourse, toggleCourse } from "@/app/actions";
import { requireRole } from "@/lib/auth";
import { getCurrentTerm } from "@/lib/data";
import { getCourses, getDepartments, getPrograms, getLevels, getSessions, getSemesters } from "@/lib/manage-data";
import { ActionForm, RowForm } from "@/components/forms";
import { EmptyState, PageHeader, Panel, StatusBadge, Table } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage() {
  await requireRole(["super_admin"]);
  const term = await getCurrentTerm();
  const [courses, departments, programs, levels, sessions, semesters] = await Promise.all([
    getCourses(), getDepartments(), getPrograms(), getLevels(), getSessions(), getSemesters(),
  ]);

  return (
    <>
      <PageHeader eyebrow="University catalogue" title="Courses & course codes"
        description="Create courses for any department and term. The server validates session/semester/program consistency and prevents duplicate codes." />
      <Panel title="Create university course" className="mb-6">
        <ActionForm action={createCourse} submitLabel="Create course" columns={3} fields={[
          { name: "departmentId", label: "Department", type: "select", required: true, options: departments.map((department) => ({ value: department.id, label: `${department.code} — ${department.name}` })) },
          { name: "code", label: "Course code", required: true, placeholder: "CSC401" },
          { name: "title", label: "Course title", required: true },
          { name: "units", label: "Credit units", type: "number", required: true, defaultValue: 3, min: 1, max: 6 },
          { name: "level", label: "Level", type: "select", required: true, options: [...new Set(levels.map((level) => level.level))].map((level) => ({ value: level, label: `${level} Level` })) },
          { name: "programId", label: "Program (optional)", type: "select", options: programs.map((program) => ({ value: program.id, label: `${program.department} · ${program.code}` })) },
          { name: "sessionId", label: "Session", type: "select", required: true, defaultValue: term.session.id, options: sessions.map((session) => ({ value: session.id, label: session.name })) },
          { name: "semesterId", label: "Semester", type: "select", required: true, defaultValue: term.semester.id, options: semesters.map((semester) => ({ value: semester.id, label: `${semester.session} · ${semester.name}` })) },
        ]} />
      </Panel>
      <Panel title={`All courses (${courses.length})`}>
        {courses.length ? <Table headers={["Code", "Title", "Department", "Units", "Level", "Program", "Term", "Lecturer", "Status", "Action"]} minWidth={1100}>
          {courses.map((course) => <tr key={course.id}><td className="strong">{course.code}</td><td>{course.title}</td><td>{course.department}</td><td>{course.units}</td><td>{course.level}</td><td>{course.program ?? "All programs"}</td><td>{course.session} · {course.semester}</td><td>{course.lecturer ?? "Unallocated"}</td><td><StatusBadge status={course.isActive ? "active" : "inactive"} /></td><td><RowForm action={toggleCourse} hidden={{ id: course.id }} label={course.isActive ? "Disable" : "Enable"} tone={course.isActive ? "danger" : "primary"} /></td></tr>)}
        </Table> : <EmptyState title="No courses" />}
      </Panel>
    </>
  );
}
