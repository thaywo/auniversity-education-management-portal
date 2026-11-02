import { requireRole } from "@/lib/auth";
import { getCurrentTerm, getStudentContext, getRegisteredCourses, getApprovedResults, groupResultsByTerm } from "@/lib/data";
import { calculateGpa, classifyGpa } from "@/lib/grades";
import { PrintButton } from "@/components/forms";
import { Badge, EmptyState, PageHeader, Panel, Table } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function StudentDocumentsPage() {
  const user = await requireRole(["student"]);
  const profile = await getStudentContext(user.id);
  if (!profile) return <Panel title="Profile missing"><p className="text-sm text-rose-600">No student record found.</p></Panel>;
  const term = await getCurrentTerm();
  const registered = await getRegisteredCourses(profile.studentId, term.session.id, term.semester.id);
  const results = await getApprovedResults(profile.studentId);
  const terms = groupResultsByTerm(results);
  const cgpa = calculateGpa(results);
  const units = registered.reduce((sum, course) => sum + course.units, 0);

  return (
    <>
      <PageHeader eyebrow="Printable records" title="Course forms & result statement"
        description="Print or save either document as a PDF using your browser, or download the underlying CSV records."
        actions={<><a href="/api/exports?type=registration" className="uemp-btn uemp-btn-ghost">Registration CSV</a><a href="/api/exports?type=results" className="uemp-btn uemp-btn-ghost">Results CSV</a><PrintButton /></>} />

      <div className="hidden print:mb-6 print:block border-b-2 border-slate-800 pb-4">
        <div className="flex items-center justify-between">
          <div><p className="text-xl font-black">UEMP</p><p className="text-xs">University Education Management Portal</p></div>
          <div className="text-right text-xs"><p>Lead Web Praxis Media Limited</p><p>Official student academic document</p><p>Generated {new Date().toLocaleDateString("en-GB")}</p></div>
        </div>
      </div>

      <Panel title="Course registration summary" subtitle={`${term.session.name} · ${term.semester.name}`} className="mb-6">
        <dl className="uemp-kv mb-5">
          {[["Student", profile.fullName], ["Matric number", profile.matricNumber], ["Department", profile.department],
            ["Program", profile.program], ["Level", `${profile.level} Level`], ["Faculty", profile.faculty]].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50 px-4 py-3"><dt className="uemp-stat-label">{label}</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{value}</dd></div>
          ))}
        </dl>
        {registered.length ? (
          <Table headers={["S/N", "Code", "Course title", "Units", "Level", "Lecturer"]} minWidth={600}>
            {registered.map((course, index) => <tr key={course.registrationId}><td>{index + 1}</td><td className="strong">{course.code}</td><td>{course.title}</td><td>{course.units}</td><td>{course.level}</td><td>{course.lecturer ?? "—"}</td></tr>)}
            <tr><td colSpan={3} className="strong">Total credit units</td><td className="strong">{units}</td><td colSpan={2} /></tr>
          </Table>
        ) : <EmptyState title="No registered courses" description="Register courses to generate a summary." />}
        <p className="mt-5 text-xs text-slate-500">This summary is generated from the student&apos;s own registration records. It cannot be used to register another student.</p>
      </Panel>

      <Panel title="Official result statement" subtitle="Approved results only">
        {terms.length ? terms.map((term) => (
          <div key={term.key} className="mb-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-slate-800">{term.session} · {term.semester}</h3>
              <Badge tone="green">GPA {term.gpa.toFixed(2)}</Badge>
            </div>
            <Table headers={["Code", "Course title", "Units", "CA", "Exam", "Total", "Grade", "Point"]} minWidth={680}>
              {term.rows.map((row) => <tr key={row.resultId}><td className="strong">{row.code}</td><td>{row.title}</td><td>{row.units}</td><td>{row.caScore}</td><td>{row.examScore}</td><td>{row.totalScore}</td><td><Badge tone={row.grade === "F" ? "red" : "green"}>{row.grade}</Badge></td><td>{row.gradePoint}</td></tr>)}
            </Table>
          </div>
        )) : <EmptyState title="No approved results" description="Your result statement will be available after departmental approval." />}
        <div className="grid gap-4 rounded-xl bg-emerald-50 p-5 sm:grid-cols-3">
          <div><p className="uemp-stat-label">Total units</p><p className="text-lg font-bold text-emerald-900">{cgpa.units}</p></div>
          <div><p className="uemp-stat-label">CGPA</p><p className="text-lg font-bold text-emerald-900">{cgpa.gpa.toFixed(2)} / 5.00</p></div>
          <div><p className="uemp-stat-label">Classification</p><p className="text-lg font-bold text-emerald-900">{classifyGpa(cgpa.gpa)}</p></div>
        </div>
      </Panel>
    </>
  );
}
