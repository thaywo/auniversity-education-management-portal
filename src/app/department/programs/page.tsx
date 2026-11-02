import { createProgram, toggleProgram, createLevel, toggleLevel } from "@/app/actions";
import { getDepartmentContext } from "@/lib/dept";
import { getPrograms, getLevels } from "@/lib/manage-data";
import { ActionForm, RowForm } from "@/components/forms";
import { EmptyState, PageHeader, Panel, StatusBadge, Table } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DepartmentProgramsPage() {
  const { departmentId, department } = await getDepartmentContext();
  const [programs, levels] = await Promise.all([getPrograms(departmentId), getLevels(departmentId)]);

  return (
    <>
      <PageHeader eyebrow={`${department} · Academic structure`} title="Programs & academic levels"
        description="Manage degree programs and active levels for this department. Faculties and other departments remain Super Admin-only." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Create degree program">
          <ActionForm action={createProgram} submitLabel="Create program" fields={[
            { name: "name", label: "Program name", required: true, placeholder: "B.Sc. Cyber Security" },
            { name: "code", label: "Program code", required: true, placeholder: "CYB" },
            { name: "degree", label: "Degree", defaultValue: "B.Sc." },
            { name: "durationYears", label: "Duration (years)", type: "number", defaultValue: 4, min: 1, max: 10, required: true },
          ]} />
        </Panel>
        <Panel title="Create academic level">
          <ActionForm action={createLevel} submitLabel="Create level" buttonTone="navy" fields={[
            { name: "level", label: "Level number", type: "number", required: true, min: 100, max: 900, step: 100, placeholder: "300" },
            { name: "name", label: "Display name", placeholder: "300 Level" },
          ]} description="Levels determine which courses a student may register for and are validated server-side." />
        </Panel>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title={`Programs (${programs.length})`}>
          {programs.length ? <Table headers={["Code", "Name", "Degree", "Duration", "Status", "Action"]}>
            {programs.map((program) => <tr key={program.id}><td className="strong">{program.code}</td><td>{program.name}</td><td>{program.degree}</td><td>{program.durationYears} years</td><td><StatusBadge status={program.isActive ? "active" : "inactive"} /></td><td><RowForm action={toggleProgram} hidden={{ id: program.id }} label={program.isActive ? "Disable" : "Enable"} tone={program.isActive ? "danger" : "primary"} /></td></tr>)}
          </Table> : <EmptyState title="No programs" description="Create a program above." />}
        </Panel>
        <Panel title={`Academic levels (${levels.length})`}>
          {levels.length ? <Table headers={["Level", "Name", "Status", "Action"]}>
            {levels.map((level) => <tr key={level.id}><td className="strong">{level.level}</td><td>{level.name}</td><td><StatusBadge status={level.isActive ? "active" : "inactive"} /></td><td><RowForm action={toggleLevel} hidden={{ id: level.id }} label={level.isActive ? "Disable" : "Enable"} tone={level.isActive ? "danger" : "primary"} /></td></tr>)}
          </Table> : <EmptyState title="No levels" description="Create a level above." />}
        </Panel>
      </div>
    </>
  );
}
