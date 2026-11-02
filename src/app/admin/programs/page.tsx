import { createProgram, toggleProgram, createLevel, toggleLevel } from "@/app/actions";
import { requireRole } from "@/lib/auth";
import { getPrograms, getLevels, getDepartments } from "@/lib/manage-data";
import { ActionForm, RowForm } from "@/components/forms";
import { EmptyState, PageHeader, Panel, StatusBadge, Table } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminProgramsPage() {
  await requireRole(["super_admin"]);
  const [programs, levels, departments] = await Promise.all([getPrograms(), getLevels(), getDepartments()]);
  const departmentOptions = departments.map((department) => ({ value: department.id, label: `${department.code} — ${department.name}` }));

  return (
    <>
      <PageHeader eyebrow="Academic structure" title="Programs & academic levels"
        description="University-wide program and level management. Department Admins can perform the same operations only inside their assigned department." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Create program">
          <ActionForm action={createProgram} submitLabel="Create program" fields={[
            { name: "departmentId", label: "Department", type: "select", required: true, full: true, options: departmentOptions },
            { name: "name", label: "Program name", required: true },
            { name: "code", label: "Program code", required: true },
            { name: "degree", label: "Degree", defaultValue: "B.Sc." },
            { name: "durationYears", label: "Duration (years)", type: "number", defaultValue: 4, min: 1, max: 10, required: true },
          ]} />
        </Panel>
        <Panel title="Create academic level">
          <ActionForm action={createLevel} submitLabel="Create level" buttonTone="navy" fields={[
            { name: "departmentId", label: "Department", type: "select", required: true, full: true, options: departmentOptions },
            { name: "level", label: "Level number", type: "number", required: true, min: 100, max: 900, step: 100 },
            { name: "name", label: "Display name", placeholder: "300 Level" },
          ]} />
        </Panel>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title={`All programs (${programs.length})`}>
          {programs.length ? <Table headers={["Code", "Name", "Department", "Duration", "Status", "Action"]} minWidth={760}>
            {programs.map((program) => <tr key={program.id}><td className="strong">{program.code}</td><td>{program.name}</td><td>{program.department}</td><td>{program.durationYears} yrs</td><td><StatusBadge status={program.isActive ? "active" : "inactive"} /></td><td><RowForm action={toggleProgram} hidden={{ id: program.id }} label={program.isActive ? "Disable" : "Enable"} tone={program.isActive ? "danger" : "primary"} /></td></tr>)}
          </Table> : <EmptyState title="No programs" />}
        </Panel>
        <Panel title={`All levels (${levels.length})`}>
          {levels.length ? <Table headers={["Level", "Name", "Department", "Status", "Action"]} minWidth={700}>
            {levels.map((level) => <tr key={level.id}><td className="strong">{level.level}</td><td>{level.name}</td><td>{level.department}</td><td><StatusBadge status={level.isActive ? "active" : "inactive"} /></td><td><RowForm action={toggleLevel} hidden={{ id: level.id }} label={level.isActive ? "Disable" : "Enable"} tone={level.isActive ? "danger" : "primary"} /></td></tr>)}
          </Table> : <EmptyState title="No levels" />}
        </Panel>
      </div>
    </>
  );
}
