import { createStudent, createLecturer, createAdminAccount, updateUserStatus, updateUserRole } from "@/app/actions";
import { requireRole } from "@/lib/auth";
import { getUsers, getDepartments, getPrograms, getLevels } from "@/lib/manage-data";
import { ActionForm, RowForm } from "@/components/forms";
import { Badge, EmptyState, PageHeader, Panel, StatusBadge, Table, formatDate } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireRole(["super_admin"]);
  const [users, departments, programs, levels] = await Promise.all([
    getUsers(), getDepartments(), getPrograms(), getLevels(),
  ]);
  const departmentOptions = departments.map((department) => ({ value: department.id, label: `${department.code} — ${department.name}` }));
  const programOptions = programs.map((program) => ({ value: program.id, label: `${program.department} · ${program.code}` }));
  const levelOptions = [...new Set(levels.map((level) => level.level))].map((level) => ({ value: level, label: `${level} Level` }));

  return (
    <>
      <PageHeader eyebrow="Identity & access management" title="User accounts, roles & permissions"
        description="Create student, lecturer and administrative accounts; assign roles/departments; activate, deactivate or suspend access."
        actions={<a href="/api/exports?type=users" className="uemp-btn uemp-btn-ghost">Download account CSV</a>} />
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Create student account">
          <ActionForm action={createStudent} submitLabel="Create student" fields={[
            { name: "fullName", label: "Full name", required: true, full: true },
            { name: "email", label: "Email", type: "email", required: true },
            { name: "matricNumber", label: "Matric number", required: true },
            { name: "departmentId", label: "Department", type: "select", required: true, options: departmentOptions },
            { name: "programId", label: "Program", type: "select", required: true, options: programOptions },
            { name: "level", label: "Level", type: "select", required: true, options: levelOptions },
            { name: "admissionYear", label: "Admission year", type: "number", required: true, defaultValue: new Date().getFullYear() },
            { name: "password", label: "Initial password", type: "password", hint: "Default: Student@123" },
          ]} />
        </Panel>
        <Panel title="Create lecturer account">
          <ActionForm action={createLecturer} submitLabel="Create lecturer" buttonTone="navy" fields={[
            { name: "fullName", label: "Full name", required: true, full: true },
            { name: "email", label: "Email", type: "email", required: true },
            { name: "staffNumber", label: "Staff number", required: true },
            { name: "departmentId", label: "Department", type: "select", required: true, options: departmentOptions },
            { name: "designation", label: "Designation", defaultValue: "Lecturer" },
            { name: "qualification", label: "Qualification" },
            { name: "password", label: "Initial password", type: "password", full: true, hint: "Default: Lecturer@123" },
          ]} />
        </Panel>
        <Panel title="Create administrative account">
          <ActionForm action={createAdminAccount} submitLabel="Create admin" fields={[
            { name: "fullName", label: "Full name", required: true, full: true },
            { name: "email", label: "Email", type: "email", required: true },
            { name: "role", label: "Role", type: "select", required: true, options: [{ value: "dept_admin", label: "Department Admin" }, { value: "super_admin", label: "Super Admin" }] },
            { name: "departmentId", label: "Department (required for Dept Admin)", type: "select", options: departmentOptions },
            { name: "password", label: "Initial password", type: "password", full: true, hint: "Default: Admin@123" },
          ]} />
        </Panel>
      </div>

      <Panel title="Change user role & department assignment" className="mt-6" subtitle="Student/lecturer profiles are created automatically when a role changes">
        <ActionForm action={updateUserRole} submitLabel="Update role / department" buttonTone="navy" columns={3} fields={[
          { name: "id", label: "User", type: "select", required: true, options: users.map((user) => ({ value: user.id, label: `${user.fullName} · ${user.email}` })) },
          { name: "role", label: "New role", type: "select", required: true, options: [{ value: "student", label: "Student" }, { value: "lecturer", label: "Lecturer" }, { value: "dept_admin", label: "Department Admin" }, { value: "super_admin", label: "Super Admin" }] },
          { name: "departmentId", label: "Department", type: "select", options: departmentOptions },
        ]} />
      </Panel>

      <Panel title={`All accounts (${users.length})`} className="mt-6" subtitle="Suspended and inactive sessions are rejected immediately by the authentication layer">
        {users.length ? <Table headers={["Name", "Email", "Role", "Department", "Identifier", "Status", "Last login", "Account controls"]} minWidth={1100}>
          {users.map((user) => (
            <tr key={user.id}>
              <td className="strong">{user.fullName}</td><td>{user.email}</td><td><Badge tone={user.role === "super_admin" ? "purple" : user.role === "dept_admin" ? "blue" : user.role === "lecturer" ? "amber" : "green"}>{user.role.replaceAll("_", " ")}</Badge></td>
              <td>{user.department ?? "University-wide"}</td><td>{user.matricNumber ?? user.staffNumber ?? "—"}</td>
              <td><StatusBadge status={user.status} /></td><td>{formatDate(user.lastLoginAt)}</td>
              <td><div className="flex flex-wrap gap-1">
                <RowForm action={updateUserStatus} hidden={{ id: user.id, status: "active" }} label="Activate" tone="primary" disabled={user.status === "active"} />
                <RowForm action={updateUserStatus} hidden={{ id: user.id, status: "inactive" }} label="Deactivate" disabled={user.status === "inactive"} />
                <RowForm action={updateUserStatus} hidden={{ id: user.id, status: "suspended" }} label="Suspend" tone="danger" disabled={user.status === "suspended"} />
              </div></td>
            </tr>
          ))}
        </Table> : <EmptyState title="No accounts" />}
      </Panel>
    </>
  );
}
