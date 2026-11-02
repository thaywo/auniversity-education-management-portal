import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getCurrentTerm, getStudentContext, getRegisteredCourses, getApprovedResults, getAvailableCourses, groupResultsByTerm } from "@/lib/data";
import { calculateGpa, classifyGpa } from "@/lib/grades";
import { hasPermission } from "@/lib/permissions";
import { Badge, EmptyState, KeyValue, PageHeader, Panel, ProgressBar, StatCard, StatusBadge, Table } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function StudentDashboard() {
  const user = await requireRole(["student"]);
  const profile = await getStudentContext(user.id);
  if (!profile) return <Panel title="Profile missing"><p className="text-sm text-rose-600">No student record is linked to this account. Contact your department.</p></Panel>;
  const term = await getCurrentTerm();
  const registered = await getRegisteredCourses(profile.studentId, term.session.id, term.semester.id);
  const available = await getAvailableCourses(profile, term.session.id, term.semester.id);
  const results = await getApprovedResults(profile.studentId);
  const terms = groupResultsByTerm(results);
  const cgpa = calculateGpa(results);
  const units = registered.reduce((sum, course) => sum + course.units, 0);
  const canRegister = await hasPermission(user, "student.register");
  const latestTerm = terms[terms.length - 1];

  return (
    <>
      <PageHeader eyebrow="Student workspace" title={`Welcome, ${profile.fullName.split(" ")[0]}`}
        description={`${term.session.name} · ${term.semester.name} · ${profile.department} · ${profile.level} Level`}
        actions={<><Link href="/student/documents" className="uemp-btn uemp-btn-ghost">Print documents</Link><Link href="/student/courses" className="uemp-btn uemp-btn-primary">Register courses</Link></>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Registered units" value={units} hint={`${registered.length} courses this semester`} icon="📚" />
        <StatCard label="Approved results" value={results.length} hint="Published by your department" icon="✓" tone="blue" />
        <StatCard label="Semester GPA" value={latestTerm?.gpa.toFixed(2) ?? "0.00"} hint={latestTerm ? latestTerm.semester : "No approved results yet"} icon="◈" tone="purple" />
        <StatCard label="Cumulative CGPA" value={cgpa.gpa.toFixed(2)} hint={classifyGpa(cgpa.gpa)} icon="★" tone="amber" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <Panel title="Current course registration" subtitle={`${term.session.name} · ${term.semester.name}`}
          actions={<Link href="/student/courses" className="uemp-btn uemp-btn-ghost uemp-btn-sm">Manage courses</Link>}>
          {registered.length ? (
            <Table headers={["Code", "Course", "Units", "Lecturer", "Result"]}>
              {registered.map((course) => (
                <tr key={course.registrationId}>
                  <td className="strong">{course.code}</td><td>{course.title}</td><td>{course.units}</td>
                  <td>{course.lecturer ?? "—"}</td>
                  <td><StatusBadge status={course.status === "approved" ? "approved" : "pending"} /></td>
                </tr>
              ))}
            </Table>
          ) : <EmptyState title="No courses registered yet" description="Eligible courses for your department, program, level and semester are ready for registration." />}
        </Panel>

        <div className="space-y-6">
          <Panel title="Academic identity">
            <KeyValue items={[
              { label: "Matriculation number", value: profile.matricNumber },
              { label: "Faculty", value: profile.faculty },
              { label: "Department", value: profile.department },
              { label: "Program", value: `${profile.degree} ${profile.program}` },
              { label: "Current level", value: `${profile.level} Level` },
              { label: "Admission year", value: profile.admissionYear },
            ]} />
          </Panel>
          <Panel title="Registration progress">
            <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-700"><span>Credit units</span><span>{units} / 24</span></div>
            <ProgressBar value={units} max={24} />
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <p>• {available.length} eligible course{available.length === 1 ? "" : "s"} still available</p>
              <p>• Registration permission: {canRegister ? <Badge tone="green">Enabled</Badge> : <Badge tone="red">Disabled by admin</Badge>}</p>
              <p>• Only approved results are published to students</p>
            </div>
          </Panel>
        </div>
      </div>

      <div className="mt-6">
        <Panel title="Recently published results" subtitle="Draft, submitted and returned results are never visible to students"
          actions={<Link href="/student/results" className="uemp-btn uemp-btn-ghost uemp-btn-sm">View all results</Link>}>
          {results.length ? (
            <Table headers={["Session", "Semester", "Code", "Course", "Units", "Total", "Grade", "Points"]}>
              {results.slice(-6).reverse().map((result) => (
                <tr key={result.resultId}>
                  <td>{result.session}</td><td>{result.semester}</td><td className="strong">{result.code}</td>
                  <td>{result.title}</td><td>{result.units}</td><td>{result.totalScore}</td>
                  <td><Badge tone={result.grade === "F" ? "red" : "green"}>{result.grade}</Badge></td>
                  <td>{result.gradePoint}</td>
                </tr>
              ))}
            </Table>
          ) : <EmptyState title="No published results" description="Approved results will appear here after departmental review." icon="📄" />}
        </Panel>
      </div>
    </>
  );
}
