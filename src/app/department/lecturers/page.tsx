import { createLecturer, updateLecturerProfile } from "@/app/actions";
import { getDepartmentContext } from "@/lib/dept";
import { getLecturerList } from "@/lib/manage-data";
import { ActionForm } from "@/components/forms";
import { EmptyState, PageHeader, Panel, StatusBadge, Table } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DepartmentLecturersPage() {
  const { departmentId, department } = await getDepartmentContext();
  const lecturers = await getLecturerList(departmentId);

  return (
    <>
      <PageHeader eyebrow={`${department} · Lecturer management`} title="Lecturer profiles & assignments"
        description="Create lecturer accounts and maintain designations. Course allocations are managed separately." />
      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <Panel title="Create lecturer profile">
          <ActionForm action={createLecturer} submitLabel="Create lecturer account" fields={[
            { name: "fullName", label: "Full name", required: true },
            { name: "email", label: "Email address", type: "email", required: true },
            { name: "staffNumber", label: "Staff number", required: true, placeholder: "STAFF/CSC/010" },
            { name: "password", label: "Initial password", type: "password", hint: "Defaults to Lecturer@123" },
            { name: "designation", label: "Designation", defaultValue: "Lecturer", placeholder: "Senior Lecturer" },
            { name: "qualification", label: "Qualification", placeholder: "PhD Computer Science" },
          ]} />
        </Panel>
        <Panel title="Update lecturer designation" subtitle="Profiles remain scoped to this department">
          <ActionForm action={updateLecturerProfile} submitLabel="Update profile" buttonTone="navy" fields={[
            { name: "id", label: "Lecturer", type: "select", required: true, full: true, options: lecturers.map((lecturer) => ({ value: lecturer.id, label: `${lecturer.staffNumber} — ${lecturer.fullName}` })) },
            { name: "designation", label: "Designation", required: true },
            { name: "qualification", label: "Qualification" },
          ]} />
          <div className="uemp-alert uemp-alert-info mt-5 mb-0">Lecturers can only access courses explicitly allocated to their profile. They cannot manage students or approve their own results.</div>
        </Panel>
      </div>
      <Panel title={`Lecturers (${lecturers.length})`} className="mt-6">
        {lecturers.length ? (
          <Table headers={["Staff number", "Name", "Email", "Designation", "Qualification", "Status"]} minWidth={850}>
            {lecturers.map((lecturer) => <tr key={lecturer.id}><td className="strong">{lecturer.staffNumber}</td><td>{lecturer.fullName}</td><td>{lecturer.email}</td><td>{lecturer.designation}</td><td>{lecturer.qualification ?? "—"}</td><td><StatusBadge status={lecturer.status} /></td></tr>)}
          </Table>
        ) : <EmptyState title="No lecturers yet" description="Create the first lecturer profile above." />}
      </Panel>
    </>
  );
}
