import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getCurrentTerm, getLecturerContext, getLecturerCourses } from "@/lib/data";
import { Badge, EmptyState, PageHeader, Panel, StatusBadge, Table, formatDate } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function LecturerSubmissionsPage() {
  const user = await requireRole(["lecturer"]);
  const lecturer = await getLecturerContext(user.id);
  if (!lecturer) return <Panel title="Profile missing"><p className="text-sm text-rose-600">No lecturer record found.</p></Panel>;
  const term = await getCurrentTerm();
  const courses = await getLecturerCourses(lecturer.lecturerId, term.session.id);

  return (
    <>
      <PageHeader eyebrow="Approval workflow" title="Submission status & feedback"
        description="Track every course result set from draft through departmental review. Submitted results are locked until a Department Admin returns or reopens them." />
      <Panel title="My result submissions">
        {courses.length ? (
          <Table headers={["Course", "Status", "Students", "Submitted", "Reviewed", "Feedback", "Action"]} minWidth={900}>
            {courses.map((course) => (
              <tr key={course.id}>
                <td className="strong">{course.code}<span className="ml-2 font-normal text-slate-500">{course.title}</span></td>
                <td><StatusBadge status={course.submission_status} /></td><td>{course.student_count}</td>
                <td>{formatDate(course.submitted_at)}</td><td>{formatDate(course.reviewed_at)}</td>
                <td>{course.feedback ? <span className="text-xs text-rose-700">{course.feedback}</span> : "—"}</td>
                <td><Link href={`/lecturer/courses/${course.id}`} className="uemp-btn uemp-btn-ghost uemp-btn-sm">Open</Link></td>
              </tr>
            ))}
          </Table>
        ) : <EmptyState title="No submissions" description="Assigned courses will appear here once allocated." />}
        <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          <Badge tone="blue">Rule</Badge> <span className="ml-2">Lecturers cannot approve their own submitted results. Only a Department Admin for the same department can approve, return or reopen them.</span>
        </div>
      </Panel>
    </>
  );
}
