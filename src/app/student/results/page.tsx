import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getStudentContext, getApprovedResults, groupResultsByTerm } from "@/lib/data";
import { hasPermission } from "@/lib/permissions";
import { Badge, EmptyState, PageHeader, Panel, StatCard, Table } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function StudentResultsPage() {
  const user = await requireRole(["student"]);
  const allowed = await hasPermission(user, "student.view_results");
  const profile = await getStudentContext(user.id);
  if (!profile) return <Panel title="Profile missing"><p className="text-sm text-rose-600">No student record found.</p></Panel>;
  if (!allowed) return <><PageHeader title="Semester results" /><div className="uemp-alert uemp-alert-error">Result viewing has been disabled for the Student role by a Super Admin.</div></>;
  const results = await getApprovedResults(profile.studentId);
  const terms = groupResultsByTerm(results);

  return (
    <>
      <PageHeader eyebrow="Academic records" title="Semester results"
        description="Only results approved by your Department Admin are published here. CA is out of 30 and the examination is out of 70."
        actions={<><a href="/api/exports?type=results" className="uemp-btn uemp-btn-ghost">Download statement</a><Link href="/student/documents" className="uemp-btn uemp-btn-navy">Print statement</Link></>} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Published courses" value={results.length} icon="📄" />
        <StatCard label="Approved credit units" value={terms.reduce((sum, term) => sum + term.units, 0)} icon="▤" tone="blue" />
        <StatCard label="Semesters on record" value={terms.length} icon="◷" tone="purple" />
      </div>

      {terms.length ? terms.map((term) => (
        <Panel key={term.key} className="mb-6" title={`${term.session} · ${term.semester}`}
          subtitle={`${term.rows.length} approved courses · ${term.units} credit units · ${term.points} weighted points`}
          actions={<Badge tone="green">GPA {term.gpa.toFixed(2)} / 5.00</Badge>}>
          <Table headers={["Code", "Course title", "Units", "CA", "Exam", "Total", "Grade", "Point", "Weighted"]}>
            {term.rows.map((row) => (
              <tr key={row.resultId}>
                <td className="strong">{row.code}</td><td>{row.title}</td><td>{row.units}</td>
                <td>{row.caScore ?? "—"}</td><td>{row.examScore ?? "—"}</td><td className="strong">{row.totalScore ?? "—"}</td>
                <td><Badge tone={row.grade === "F" ? "red" : "green"}>{row.grade ?? "—"}</Badge></td>
                <td>{row.gradePoint ?? "—"}</td><td>{row.units * (row.gradePoint ?? 0)}</td>
              </tr>
            ))}
          </Table>
          <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
            Semester GPA = {term.points} weighted points ÷ {term.units} units = {term.gpa.toFixed(2)}
          </div>
        </Panel>
      )) : <Panel><EmptyState title="No approved results yet" description="Results become visible after a lecturer submits them and your Department Admin approves them." icon="📄" /></Panel>}
    </>
  );
}
