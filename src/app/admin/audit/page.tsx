import { requireRole } from "@/lib/auth";
import { getAuditTrail } from "@/lib/data";
import { Badge, EmptyState, PageHeader, Panel, Table, formatDate } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  await requireRole(["super_admin"]);
  const logs = await getAuditTrail(undefined, 250);

  return (
    <>
      <PageHeader eyebrow="Security monitoring" title="System activity & audit trail"
        description="Every login, result draft, submission, approval, rejection, reopening, score change, registration and administrative action is traceable." />
      <Panel title={`Recorded actions (${logs.length})`}>
        {logs.length ? <Table headers={["Timestamp", "Actor", "Department", "Action", "Entity", "ID", "Details"]} minWidth={1050}>
          {logs.map((log) => <tr key={log.id}>
            <td className="whitespace-nowrap">{formatDate(log.createdAt)}</td>
            <td>{log.actorName ?? "System"}</td><td>{log.department ?? "University-wide"}</td>
            <td><Badge tone={log.action.includes("APPROV") ? "green" : log.action.includes("RETURN") || log.action.includes("REJECT") || log.action.includes("SUSPEND") ? "red" : "blue"}>{log.action.replaceAll("_", " ")}</Badge></td>
            <td>{log.entity}</td><td>{log.entityId ?? "—"}</td>
            <td className="max-w-md truncate font-mono text-[11px]">{JSON.stringify(log.details)}</td>
          </tr>)}
        </Table> : <EmptyState title="No audit entries" icon="◷" />}
        <div className="uemp-alert uemp-alert-info mt-5 mb-0">Audit records are append-only through application actions and include structured before/after values for result workflows and account changes.</div>
      </Panel>
    </>
  );
}
