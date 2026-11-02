import Link from "next/link";
import { notFound } from "next/navigation";
import { reviewSubmission } from "@/app/actions";
import { getDepartmentContext } from "@/lib/dept";
import { getSubmissionById, getCourseRoster } from "@/lib/data";
import { hasPermission } from "@/lib/permissions";
import { ActionForm } from "@/components/forms";
import { Badge, KeyValue, PageHeader, Panel, StatusBadge, Table, formatDate } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ReviewSubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, departmentId } = await getDepartmentContext();
  const { id } = await params;
  const submissionId = Number(id);
  if (!Number.isInteger(submissionId)) notFound();
  const submission = await getSubmissionById(submissionId);
  if (!submission || submission.departmentId !== departmentId) notFound();
  const roster = await getCourseRoster(submission.courseId);
  const allowed = await hasPermission(user, "dept.review_results");
  const canApprove = allowed && submission.status === "submitted";
  const canReopen = allowed && submission.status === "approved";
  const incomplete = roster.filter((row) => row.resultStatus !== "submitted").length;

  return (
    <>
      <PageHeader eyebrow="Departmental result review" title={`${submission.code} · ${submission.title}`}
        description={`Inspect submitted CA/exam scores for ${submission.department} before approving publication to students.`}
        actions={<><Link href="/department/results" className="uemp-btn uemp-btn-ghost">← All submissions</Link><StatusBadge status={submission.status} /></>} />

      <div className="mb-6">
        <Panel title="Submission details">
          <KeyValue items={[
            { label: "Course", value: `${submission.code} · ${submission.units} units` },
            { label: "Lecturer", value: submission.lecturer },
            { label: "Department", value: submission.department },
            { label: "Term", value: `${submission.session} · ${submission.semester}` },
            { label: "Students", value: roster.length },
            { label: "Submitted", value: formatDate(submission.submittedAt) },
            { label: "Reviewed", value: formatDate(submission.reviewedAt) },
            { label: "Reviewer", value: submission.reviewer ?? "—" },
          ]} />
          {submission.feedback && <div className="uemp-alert uemp-alert-info mt-5 mb-0"><strong>Previous feedback:</strong> {submission.feedback}</div>}
        </Panel>
      </div>

      <Panel title="Submitted class list" subtitle="Grades are calculated from CA (30) + exam (70) using the university grading scale" className="mb-6">
        <Table headers={["Matric number", "Student", "Level", "CA", "Exam", "Total", "Grade", "Point", "Record"]} minWidth={900}>
          {roster.map((row) => (
            <tr key={row.registrationId}>
              <td className="strong">{row.matricNumber}</td><td>{row.fullName}</td><td>{row.level}</td>
              <td>{row.caScore ?? "—"}</td><td>{row.examScore ?? "—"}</td><td className="strong">{row.totalScore ?? "—"}</td>
              <td><Badge tone={row.grade === "F" ? "red" : "green"}>{row.grade ?? "—"}</Badge></td>
              <td>{row.gradePoint ?? "—"}</td><td><StatusBadge status={row.resultStatus ?? "not entered"} /></td>
            </tr>
          ))}
          {!roster.length && <tr><td colSpan={9} className="py-8 text-center text-slate-500">No students are registered for this course.</td></tr>}
        </Table>
        {incomplete > 0 && canApprove && <div className="uemp-alert uemp-alert-error mt-4 mb-0">{incomplete} student record(s) are incomplete or unsubmitted. Approval is blocked by the server.</div>}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Approve publication" subtitle="Approved results become visible to students immediately">
          {canApprove ? (
            <ActionForm action={reviewSubmission} hidden={{ submissionId, decision: "approve" }} submitLabel="Approve results"
              fields={[{ name: "feedback", label: "Approval note (optional)", type: "textarea", rows: 2, full: true, placeholder: "Verified and approved for publication." }]}
              description="Approval is recorded in the audit trail with your identity and timestamp." />
          ) : <p className="text-sm text-slate-500">Only a submitted result set can be approved. Current status: <StatusBadge status={submission.status} /></p>}
        </Panel>
        <Panel title="Return for correction / reopen" subtitle="Feedback is required and becomes visible to the lecturer">
          {canApprove || canReopen ? (
            <ActionForm action={reviewSubmission} hidden={{ submissionId, decision: canReopen ? "reopen" : "return" }}
              submitLabel={canReopen ? "Reopen approved results" : "Return / reject submission"} buttonTone="danger"
              fields={[{ name: "feedback", label: "Feedback to lecturer", type: "textarea", rows: 3, required: true, full: true, placeholder: "Describe the corrections required…" }]}
              description={canReopen ? "Reopening unlocks scores for correction and removes student visibility." : "Returning unlocks the lecturer's score sheet and records the rejection reason."} />
          ) : <p className="text-sm text-slate-500">Return is available for submitted results; reopening is available for approved results. Current status: <StatusBadge status={submission.status} /></p>}
        </Panel>
      </div>

      <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
        <strong>RBAC rule:</strong> only a Department Admin assigned to {submission.department} may approve, return or reopen this submission. Lecturers cannot approve their own results, and Super Admins monitor but do not approve departmental results.
      </div>
    </>
  );
}
