import { createStudent, updateStudentAcademic } from "@/app/actions";
import { getDepartmentContext } from "@/lib/dept";
import { getStudents, getPrograms, getLevels } from "@/lib/manage-data";
import { ActionForm } from "@/components/forms";
import { EmptyState, PageHeader, Panel, StatusBadge, Table } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DepartmentStudentsPage() {
  const { departmentId, department } = await getDepartmentContext();
  const [students, programs, levels] = await Promise.all([
    getStudents(departmentId), getPrograms(departmentId), getLevels(departmentId),
  ]);
  const programOptions = programs.map((program) => ({ value: program.id, label: `${program.code} — ${program.name}` }));
  const levelOptions = levels.map((level) => ({ value: level.level, label: level.name }));

  return (
    <>
      <PageHeader eyebrow={`${department} · Student management`} title="Register & manage students"
        description="Create student accounts, assign matriculation numbers and update programs/levels within your department."
        actions={<a href="/api/exports?type=students" className="uemp-btn uemp-btn-ghost">Download student list</a>} />
      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <Panel title="Register a new student" subtitle="The account is created with the Student role and linked to this department">
          <ActionForm action={createStudent} submitLabel="Create student account" fields={[
            { name: "fullName", label: "Full name", required: true },
            { name: "email", label: "Email address", type: "email", required: true },
            { name: "matricNumber", label: "Matriculation number", required: true, placeholder: "2025/CSC/010" },
            { name: "password", label: "Initial password", type: "password", hint: "Defaults to Student@123; minimum 8 characters" },
            { name: "programId", label: "Program", type: "select", required: true, options: programOptions },
            { name: "level", label: "Academic level", type: "select", required: true, options: levelOptions },
            { name: "admissionYear", label: "Admission year", type: "number", required: true, defaultValue: new Date().getFullYear(), min: 1990, max: 2100 },
            { name: "gender", label: "Gender", type: "select", options: [{ value: "Female", label: "Female" }, { value: "Male", label: "Male" }, { value: "Other", label: "Other" }] },
          ]} />
        </Panel>
        <div className="space-y-6">
          <Panel title="Update student program / level" subtitle="Academic identity changes are audited; grades remain immutable">
            <ActionForm action={updateStudentAcademic} submitLabel="Update academic record" buttonTone="navy" fields={[
              { name: "id", label: "Student", type: "select", required: true, full: true, options: students.map((student) => ({ value: student.id, label: `${student.matricNumber} — ${student.fullName}` })) },
              { name: "programId", label: "Program", type: "select", required: true, options: programOptions },
              { name: "level", label: "Level", type: "select", required: true, options: levelOptions },
            ]} />
          </Panel>
          <Panel title="Scope restriction">
            <div className="uemp-alert uemp-alert-info mb-0">Department Admins can only create and edit students in <strong>{department}</strong>. Cross-department IDs are rejected server-side, and only the Super Admin may activate, deactivate or suspend accounts.</div>
          </Panel>
        </div>
      </div>
      <Panel title={`Departmental students (${students.length})`} className="mt-6">
        {students.length ? (
          <Table headers={["Matric number", "Name", "Email", "Program", "Level", "Admission", "Status"]} minWidth={850}>
            {students.map((student) => (
              <tr key={student.id}>
                <td className="strong">{student.matricNumber}</td><td>{student.fullName}</td><td>{student.email}</td>
                <td>{student.program}</td><td>{student.level}</td><td>{student.admissionYear}</td>
                <td><StatusBadge status={student.status} /></td>
              </tr>
            ))}
          </Table>
        ) : <EmptyState title="No students yet" description="Register the first student using the form above." />}
      </Panel>
    </>
  );
}
