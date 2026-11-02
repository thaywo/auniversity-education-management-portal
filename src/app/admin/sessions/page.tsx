import { createSession, toggleSession, setCurrentSession, createSemester, toggleSemester, setCurrentSemester } from "@/app/actions";
import { requireRole } from "@/lib/auth";
import { getSessions, getSemesters } from "@/lib/manage-data";
import { ActionForm, RowForm } from "@/components/forms";
import { Badge, EmptyState, PageHeader, Panel, StatusBadge, Table } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminSessionsPage() {
  await requireRole(["super_admin"]);
  const [sessions, semesters] = await Promise.all([getSessions(), getSemesters()]);

  return (
    <>
      <PageHeader eyebrow="Academic calendar" title="Sessions & semesters"
        description="Manage academic sessions, create semesters, activate terms and set exactly one current session/semester for student registration." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Create academic session" subtitle="First and Second Semester are created automatically">
          <ActionForm action={createSession} submitLabel="Create session" fields={[
            { name: "name", label: "Session label", required: true, placeholder: "2026/2027" },
          ]} />
        </Panel>
        <Panel title="Create / add semester">
          <ActionForm action={createSemester} submitLabel="Create semester" buttonTone="navy" fields={[
            { name: "sessionId", label: "Academic session", type: "select", required: true, full: true, options: sessions.map((session) => ({ value: session.id, label: session.name })) },
            { name: "name", label: "Semester name", required: true, defaultValue: "First Semester" },
            { name: "number", label: "Semester number", type: "number", required: true, min: 1, max: 3, defaultValue: 1 },
          ]} />
        </Panel>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title={`Academic sessions (${sessions.length})`}>
          {sessions.length ? <Table headers={["Session", "Current", "Status", "Actions"]}>
            {sessions.map((session) => <tr key={session.id}><td className="strong">{session.name}</td><td>{session.isCurrent ? <Badge tone="green">Current</Badge> : "—"}</td><td><StatusBadge status={session.isActive ? "active" : "inactive"} /></td><td><div className="flex flex-wrap gap-1"><RowForm action={setCurrentSession} hidden={{ id: session.id }} label="Set current" tone="primary" disabled={session.isCurrent} /><RowForm action={toggleSession} hidden={{ id: session.id }} label={session.isActive ? "Deactivate" : "Activate"} tone={session.isActive ? "danger" : "ghost"} /></div></td></tr>)}
          </Table> : <EmptyState title="No sessions" />}
        </Panel>
        <Panel title={`Semesters (${semesters.length})`}>
          {semesters.length ? <Table headers={["Session", "Semester", "No.", "Current", "Status", "Actions"]} minWidth={720}>
            {semesters.map((semester) => <tr key={semester.id}><td>{semester.session}</td><td className="strong">{semester.name}</td><td>{semester.number}</td><td>{semester.isCurrent ? <Badge tone="green">Current</Badge> : "—"}</td><td><StatusBadge status={semester.isActive ? "active" : "inactive"} /></td><td><div className="flex flex-wrap gap-1"><RowForm action={setCurrentSemester} hidden={{ id: semester.id }} label="Set current" tone="primary" disabled={semester.isCurrent} /><RowForm action={toggleSemester} hidden={{ id: semester.id }} label={semester.isActive ? "Close" : "Open"} tone={semester.isActive ? "danger" : "ghost"} /></div></td></tr>)}
          </Table> : <EmptyState title="No semesters" />}
        </Panel>
      </div>
      <div className="mt-6 uemp-alert uemp-alert-info mb-0">Closing the current semester prevents new student course registrations. Setting a semester current also activates its academic session.</div>
    </>
  );
}
