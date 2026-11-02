import { createFaculty, toggleFaculty, createDepartment, toggleDepartment } from "@/app/actions";
import { requireRole } from "@/lib/auth";
import { getFaculties, getDepartments } from "@/lib/manage-data";
import { ActionForm, RowForm } from "@/components/forms";
import { EmptyState, PageHeader, Panel, StatusBadge, Table } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminStructurePage() {
  await requireRole(["super_admin"]);
  const [faculties, departments] = await Promise.all([getFaculties(), getDepartments()]);

  return (
    <>
      <PageHeader eyebrow="Workflow 4 · Academic structure" title="Faculties & departments"
        description="Create and activate/deactivate the university's organizational structure. New departments receive standard 100–500 levels automatically." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Create faculty">
          <ActionForm action={createFaculty} submitLabel="Create faculty" fields={[
            { name: "name", label: "Faculty name", required: true, placeholder: "Faculty of Engineering" },
            { name: "code", label: "Faculty code", required: true, placeholder: "FEG" },
          ]} />
        </Panel>
        <Panel title="Create department">
          <ActionForm action={createDepartment} submitLabel="Create department" buttonTone="navy" fields={[
            { name: "name", label: "Department name", required: true },
            { name: "code", label: "Department code", required: true },
            { name: "facultyId", label: "Faculty", type: "select", required: true, full: true, options: faculties.map((faculty) => ({ value: faculty.id, label: `${faculty.code} — ${faculty.name}` })) },
          ]} />
        </Panel>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title={`Faculties (${faculties.length})`}>
          {faculties.length ? <Table headers={["Code", "Name", "Status", "Action"]}>
            {faculties.map((faculty) => <tr key={faculty.id}><td className="strong">{faculty.code}</td><td>{faculty.name}</td><td><StatusBadge status={faculty.isActive ? "active" : "inactive"} /></td><td><RowForm action={toggleFaculty} hidden={{ id: faculty.id }} label={faculty.isActive ? "Deactivate" : "Activate"} tone={faculty.isActive ? "danger" : "primary"} /></td></tr>)}
          </Table> : <EmptyState title="No faculties" />}
        </Panel>
        <Panel title={`Departments (${departments.length})`}>
          {departments.length ? <Table headers={["Code", "Name", "Faculty", "Status", "Action"]}>
            {departments.map((department) => <tr key={department.id}><td className="strong">{department.code}</td><td>{department.name}</td><td>{department.faculty}</td><td><StatusBadge status={department.isActive ? "active" : "inactive"} /></td><td><RowForm action={toggleDepartment} hidden={{ id: department.id }} label={department.isActive ? "Deactivate" : "Activate"} tone={department.isActive ? "danger" : "primary"} /></td></tr>)}
          </Table> : <EmptyState title="No departments" />}
        </Panel>
      </div>
    </>
  );
}
