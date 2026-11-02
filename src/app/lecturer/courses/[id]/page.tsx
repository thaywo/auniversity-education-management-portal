import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { resultSubmissions } from "@/db/schema";
import { saveResultScores } from "@/app/actions";
import { requireRole } from "@/lib/auth";
import { getCurrentTerm, getLecturerContext, getLecturerCourses, getCourseRoster, getCourseById } from "@/lib/data";
import { getGradingScale } from "@/lib/grades";
import ScoreEditor from "@/components/ScoreEditor";
import { Badge, KeyValue, PageHeader, Panel, StatusBadge, formatDate } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function LecturerCourseDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["lecturer"]);
  const lecturer = await getLecturerContext(user.id);
  if (!lecturer) notFound();
  const { id } = await params;
  const courseId = Number(id);
  if (!Number.isInteger(courseId)) notFound();
  const term = await getCurrentTerm();
  const allocated = await getLecturerCourses(lecturer.lecturerId, term.session.id);
  const allocation = allocated.find((course) => course.id === courseId);
  if (!allocation) notFound();
  const course = await getCourseById(courseId);
  if (!course || course.departmentId !== lecturer.departmentId) notFound();
  const roster = await getCourseRoster(courseId);
  const scale = await getGradingScale();
  const [submission] = await db.select().from(resultSubmissions).where(and(
    eq(resultSubmissions.courseId, courseId), eq(resultSubmissions.lecturerId, lecturer.lecturerId),
    eq(resultSubmissions.sessionId, term.session.id),
  )).limit(1);
  const status = submission?.status ?? "draft";
  const locked = status === "submitted" || status === "approved";

  return (
    <>
      <PageHeader eyebrow="Result entry · Workflow 2" title={`${course.code} · ${course.title}`}
        description={`${course.department} · ${course.level} Level · ${course.units} units · ${course.session} ${course.semester}`}
        actions={<><Link href="/lecturer/courses" className="uemp-btn uemp-btn-ghost">← Assigned courses</Link><StatusBadge status={status} /></>} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Panel><p className="uemp-stat-label">Registered students</p><p className="uemp-stat-value">{roster.length}</p></Panel>
        <Panel><p className="uemp-stat-label">Scores complete</p><p className="uemp-stat-value">{roster.filter((row) => row.caScore !== null && row.examScore !== null).length}</p></Panel>
        <Panel><p className="uemp-stat-label">Submission state</p><p className="mt-3"><StatusBadge status={status} /></p></Panel>
        <Panel><p className="uemp-stat-label">Last submitted</p><p className="mt-3 text-sm font-semibold text-slate-800">{formatDate(submission?.submittedAt)}</p></Panel>
      </div>

      <div className="mb-6">
        <Panel title="Course & submission details">
          <KeyValue items={[
            { label: "Course code", value: course.code }, { label: "Credit units", value: course.units },
            { label: "Semester", value: course.semester }, { label: "Session", value: course.session },
            { label: "Department", value: course.department }, { label: "Lecturer", value: lecturer.fullName },
            { label: "Reviewed at", value: formatDate(submission?.reviewedAt) }, { label: "Record", value: <Badge tone={locked ? "red" : "green"}>{locked ? "Locked" : "Editable"}</Badge> },
          ]} />
        </Panel>
      </div>

      <Panel title="Class list & score sheet" subtitle="Enter continuous assessment (0–30) and examination (0–70); totals and grades are calculated server-side"
        bodyClass="!p-0 sm:!p-0">
        <div className="p-4 sm:p-6">
          <ScoreEditor courseId={courseId} courseLabel={`${course.code} · ${course.title}`} rows={roster} locked={locked}
            status={status} feedback={submission?.feedback ?? null} scale={scale} action={saveResultScores} />
        </div>
      </Panel>
    </>
  );
}
