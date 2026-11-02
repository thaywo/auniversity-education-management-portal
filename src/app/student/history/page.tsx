import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getStudentContext, getApprovedResults, groupResultsByTerm } from "@/lib/data";
import { calculateGpa, classifyGpa } from "@/lib/grades";
import { Badge, EmptyState, KeyValue, PageHeader, Panel, ProgressBar, StatCard, Table } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AcademicHistoryPage() {
  const user = await requireRole(["student"]);
  const profile = await getStudentContext(user.id);
  if (!profile) return <Panel title="Profile missing"><p className="text-sm text-rose-600">No student record found.</p></Panel>;
  const results = await getApprovedResults(profile.studentId);
  const terms = groupResultsByTerm(results);
  const cgpa = calculateGpa(results);

  return (
    <>
      <PageHeader eyebrow="Academic history" title="Academic history & CGPA"
        description="A credit-unit-weighted cumulative record built exclusively from approved results."
        actions={<Link href="/student/documents" className="uemp-btn uemp-btn-navy">Print result statement</Link>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="CGPA" value={cgpa.gpa.toFixed(2)} hint="Scale: 0.00 – 5.00" icon="★" tone="amber" />
        <StatCard label="Class of degree" value={<span className="text-xl">{classifyGpa(cgpa.gpa)}</span>} hint="Indicative classification" icon="🎓" tone="purple" />
        <StatCard label="Total credit units" value={cgpa.units} hint="Approved, graded courses" icon="▤" tone="blue" />
        <StatCard label="Weighted points" value={cgpa.points} hint="Σ(units × grade point)" icon="Σ" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Semester-by-semester record">
          {terms.length ? (
            <Table headers={["Session", "Semester", "Courses", "Units", "Weighted points", "GPA"]}>
              {terms.map((term) => (
                <tr key={term.key}>
                  <td className="strong">{term.session}</td><td>{term.semester}</td><td>{term.rows.length}</td>
                  <td>{term.units}</td><td>{term.points}</td>
                  <td><Badge tone={term.gpa >= 3.5 ? "green" : "amber"}>{term.gpa.toFixed(2)}</Badge></td>
                </tr>
              ))}
            </Table>
          ) : <EmptyState title="No academic history yet" description="Approved semester results will build your history automatically." />}
        </Panel>
        <div className="space-y-6">
          <Panel title="Student record"><KeyValue items={[
            { label: "Name", value: profile.fullName }, { label: "Matric number", value: profile.matricNumber },
            { label: "Program", value: profile.program }, { label: "Department", value: profile.department },
            { label: "Faculty", value: profile.faculty }, { label: "Admission year", value: profile.admissionYear },
          ]} /></Panel>
          <Panel title="CGPA scale">
            <div className="mb-2 flex justify-between text-sm font-semibold text-slate-700"><span>{cgpa.gpa.toFixed(2)} / 5.00</span><span>{Math.round((cgpa.gpa / 5) * 100)}%</span></div>
            <ProgressBar value={cgpa.gpa} max={5} />
            <p className="mt-4 text-xs leading-relaxed text-slate-500">CGPA = Σ(course units × grade point) ÷ Σ(course units). Failed courses remain in the calculation with zero grade points. Grades are read-only for students.</p>
          </Panel>
        </div>
      </div>

      <Panel title="Approved course record" className="mt-6">
        {results.length ? (
          <Table headers={["Session", "Semester", "Code", "Title", "Units", "Grade", "Point"]}>
            {results.map((row) => <tr key={row.resultId}><td>{row.session}</td><td>{row.semester}</td><td className="strong">{row.code}</td><td>{row.title}</td><td>{row.units}</td><td><Badge tone={row.grade === "F" ? "red" : "green"}>{row.grade}</Badge></td><td>{row.gradePoint}</td></tr>)}
          </Table>
        ) : <EmptyState title="No approved courses" description="Your approved courses will appear here." />}
      </Panel>
    </>
  );
}
