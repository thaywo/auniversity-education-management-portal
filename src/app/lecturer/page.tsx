import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getCurrentTerm, getLecturerContext, getLecturerCourses } from "@/lib/data";
import { Badge, EmptyState, KeyValue, PageHeader, Panel, StatCard, StatusBadge, Table, formatDate } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function LecturerDashboard() {
  const user = await requireRole(["lecturer"]);
  const lecturer = await getLecturerContext(user.id);
  if (!lecturer) return <Panel title="Profile missing"><p className="text-sm text-rose-600">No lecturer record found.</p></Panel>;
  const term = await getCurrentTerm();
  const courses = await getLecturerCourses(lecturer.lecturerId, term.session.id);
  const students = courses.reduce((sum, course) => sum + course.student_count, 0);
  const pending = courses.filter((course) => course.submission_status === "submitted").length;
  const returned = courses.filter((course) => course.submission_status === "returned");
  const approved = courses.filter((course) => course.submission_status === "approved").length;

  return (
    <>
      <PageHeader eyebrow="Lecturer workspace" title={`Welcome, ${lecturer.fullName}`}
        description={`${lecturer.designation} · ${lecturer.department} · ${term.session.name} ${term.semester.name}`}
        actions={<Link href="/lecturer/courses" className="uemp-btn uemp-btn-primary">Open assigned courses</Link>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Assigned courses" value={courses.length} hint="Current academic session" icon="📚" />
        <StatCard label="Registered students" value={students} hint="Across assigned class lists" icon="◎" tone="blue" />
        <StatCard label="Awaiting review" value={pending} hint="Submitted result sets" icon="◷" tone="amber" />
        <StatCard label="Approved courses" value={approved} hint="Published to students" icon="✓" tone="green" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="My assigned courses" subtitle="Only courses allocated to your account are accessible"
          actions={<Link href="/lecturer/courses" className="uemp-btn uemp-btn-ghost uemp-btn-sm">View all</Link>}>
          {courses.length ? (
            <Table headers={["Code", "Course", "Semester", "Students", "Status", "Action"]}>
              {courses.slice(0, 7).map((course) => (
                <tr key={course.id}>
                  <td className="strong">{course.code}</td><td>{course.title}</td><td>{course.semester_name}</td>
                  <td>{course.student_count}</td><td><StatusBadge status={course.submission_status} /></td>
                  <td><Link href={`/lecturer/courses/${course.id}`} className="uemp-btn uemp-btn-ghost uemp-btn-sm">Open</Link></td>
                </tr>
              ))}
            </Table>
          ) : <EmptyState title="No course allocations" description="Ask your Department Admin to allocate courses to your profile." />}
        </Panel>
        <div className="space-y-6">
          <Panel title="Lecturer profile"><KeyValue items={[
            { label: "Staff number", value: lecturer.staffNumber }, { label: "Department", value: lecturer.department },
            { label: "Designation", value: lecturer.designation }, { label: "Qualification", value: lecturer.qualification ?? "—" },
          ]} /></Panel>
          <Panel title="Departmental feedback">
            {returned.length ? returned.map((course) => (
              <div key={course.id} className="mb-3 rounded-xl border border-rose-100 bg-rose-50 p-3 last:mb-0">
                <div className="flex items-center justify-between"><p className="text-sm font-bold text-rose-900">{course.code}</p><Badge tone="red">Returned</Badge></div>
                <p className="mt-1 text-xs text-rose-800">{course.feedback ?? "No feedback supplied."}</p>
                <Link href={`/lecturer/courses/${course.id}`} className="mt-2 inline-block text-xs font-bold text-rose-900 underline">Correct scores →</Link>
              </div>
            )) : <p className="text-sm text-slate-500">No returned result sets. All submissions are either in progress or approved.</p>}
          </Panel>
        </div>
      </div>

      <Panel title="Recent submission activity" className="mt-6">
        {courses.some((course) => course.submitted_at) ? (
          <Table headers={["Course", "Status", "Submitted", "Reviewed", "Students"]}>
            {courses.filter((course) => course.submitted_at).map((course) => (
              <tr key={course.id}><td className="strong">{course.code}</td><td><StatusBadge status={course.submission_status} /></td>
                <td>{formatDate(course.submitted_at)}</td><td>{formatDate(course.reviewed_at)}</td><td>{course.student_count}</td></tr>
            ))}
          </Table>
        ) : <EmptyState title="No submissions yet" description="Enter scores and submit a course to start the approval workflow." icon="◷" />}
      </Panel>
    </>
  );
}
