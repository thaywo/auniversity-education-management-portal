import Link from "next/link";
import { getDepartmentContext } from "@/lib/dept";
import { getSubmissions } from "@/lib/data";
import { hasPermission } from "@/lib/permissions";
import { EmptyState, PageHeader, Panel, StatCard, StatusBadge, Table, formatDate } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DepartmentResultsPage() {
  const { user, departmentId, department } = await getDepartmentContext();
  const allowed = await hasPermission(user, "dept.review_results");
  const submissions = await getSubmissions(departmentId);
  const counts = {
    pending: submissions.filter((row) => row.status === "submitted").length,
    approved: submissions.filter((row) => row.status === "approved").length,
    returned: submissions.filter((row) => row.status === "returned").length,
    draft: submissions.filter((row) => row.status === "draft").length,
  };

  return (
    <>
      <PageHeader eyebrow="Workflow 3 · Departmental approval" title="Result review & approval"
        description={`Review submitted result sets for ${department} only. Approval publishes results to students; returning a set unlocks corrections for the lecturer.`}
        actions={<a href="/api/exports?type=performance" className="uemp-btn uemp-btn-ghost">Performance CSV</a>} />
      {!allowed && <div className="uemp-alert uemp-alert-error">The result review permission is currently disabled for the Department Admin role by a Super Admin.</div>}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Awaiting review" value={counts.pending} icon="◷" tone="amber" />
        <StatCard label="Approved" value={counts.approved} icon="✓" tone="green" />
        <StatCard label="Returned" value={counts.returned} icon="↩" tone="red" />
        <StatCard label="Lecturer drafts" value={counts.draft} icon="✍️" tone="blue" />
      </div>
      <Panel title="Course result submissions" subtitle="Select a course to inspect every student's score before deciding">
        {submissions.length ? (
          <Table headers={["Course", "Lecturer", "Term", "Students", "Status", "Submitted", "Reviewer", "Feedback", "Action"]} minWidth={1000}>
            {submissions.map((row) => (
              <tr key={row.id}>
                <td className="strong">{row.code}<span className="ml-2 block text-xs font-normal text-slate-500">{row.title}</span></td>
                <td>{row.lecturer}</td><td>{row.session}<span className="block text-xs text-slate-500">{row.semester}</span></td>
                <td>{row.studentCount}</td><td><StatusBadge status={row.status} /></td>
                <td>{formatDate(row.submittedAt)}</td><td>{row.reviewer ?? "—"}</td>
                <td className="max-w-[220px] truncate text-xs">{row.feedback ?? "—"}</td>
                <td><Link href={`/department/results/${row.id}`} className="uemp-btn uemp-btn-primary uemp-btn-sm">Open review</Link></td>
              </tr>
            ))}
          </Table>
        ) : <EmptyState title="No result submissions" description="Lecturers will appear here after they submit a course result set." icon="✓" />}
      </Panel>
    </>
  );
}
