import { getDepartmentContext } from "@/lib/dept";
import { getAuditTrail } from "@/lib/data";
import { Badge, EmptyState, PageHeader, Panel, Table, formatDate } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DepartmentAuditPage() {
  const { departmentId, department } = await getDepartmentContext();
  const logs = await getAuditTrail(departmentId, 150);

  return (
    <>
      <PageHeader eyebrow={`${department} · Traceability`} title="Departmental audit trail"
        description="Result submissions, approvals, rejections, score changes, registrations and administrative actions are recorded with actor and details." />
      <Panel title={`Recent actions (${logs.length})`}>
        {logs.length ? (
          <Table headers={["Timestamp", "Actor", "Action", "Entity", "ID", "Details"]} minWidth={900}>
            {logs.map((log) => <tr key={log.id}><td className="whitespace-nowrap">{formatDate(log.createdAt)}</td><td>{log.actorName ?? "System"}</td><td><Badge tone={log.action.includes("APPROV") ? "green" : log.action.includes("RETURN") || log.action.includes("REJECT") ? "red" : "blue"}>{log.action.replaceAll("_", " ")}</Badge></td><td>{log.entity}</td><td>{log.entityId ?? "—"}</td><td className="max-w-sm truncate font-mono text-[11px]">{JSON.stringify(log.details)}</td></tr>)}
          </Table>
        ) : <EmptyState title="No audit entries" description="Administrative actions will be recorded here." icon="◷" />}
      </Panel>
    </>
  );
}
