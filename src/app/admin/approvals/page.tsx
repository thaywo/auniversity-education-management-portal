import { requireRole } from "@/lib/auth";
import { getSubmissions } from "@/lib/data";
import { EmptyState, PageHeader, Panel, StatCard, StatusBadge, Table, formatDate } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminApprovalsPage() {
  await requireRole(["super_admin"]);
  const submissions = await getSubmissions();
  const statusCount = (status: string) => submissions.filter((row) => row.status === status).length;

  return (
    <>
      <PageHeader eyebrow="Governance & oversight" title="Departmental result approvals"
        description="Monitor the status of every course result submission across the university. Approval authority remains with the authorized Department Admin." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Submitted" value={statusCount("submitted")} hint="Awaiting departmental review" icon="◷" tone="amber" />
        <StatCard label="Approved" value={statusCount("approved")} hint="Published to students" icon="✓" tone="green" />
        <StatCard label="Returned" value={statusCount("returned")} hint="Corrections requested" icon="↩" tone="red" />
        <StatCard label="Drafts" value={statusCount("draft")} hint="Not yet submitted" icon="✍️" tone="blue" />
      </div>
      <Panel title="All result submissions">
        {submissions.length ? <Table headers={["Course", "Department", "Lecturer", "Term", "Students", "Status", "Submitted", "Reviewed by", "Feedback"]} minWidth={1100}>
          {submissions.map((row) => <tr key={row.id}><td className="strong">{row.code}<span className="ml-2 block text-xs font-normal text-slate-500">{row.title}</span></td><td>{row.department}</td><td>{row.lecturer}</td><td>{row.session} · {row.semester}</td><td>{row.studentCount}</td><td><StatusBadge status={row.status} /></td><td>{formatDate(row.submittedAt)}</td><td>{row.reviewer ?? "—"}</td><td className="max-w-[220px] truncate text-xs">{row.feedback ?? "—"}</td></tr>)}
        </Table> : <EmptyState title="No submissions" />}
        <div className="uemp-alert uemp-alert-info mt-5 mb-0"><strong>Business rule:</strong> results must be submitted by the allocated lecturer and approved or returned only by a Department Admin in the same department. The Super Admin can monitor but cannot approve results directly.</div>
      </Panel>
    </>
  );
}
