import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { results } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getCurrentTerm, getLecturerContext, getLecturerCourses } from "@/lib/data";
import { Badge, EmptyState, PageHeader, Panel, ProgressBar, StatCard, Table } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function LecturerPerformancePage() {
  const user = await requireRole(["lecturer"]);
  const lecturer = await getLecturerContext(user.id);
  if (!lecturer) return <Panel title="Profile missing"><p className="text-sm text-rose-600">No lecturer record found.</p></Panel>;
  const term = await getCurrentTerm();
  const courses = await getLecturerCourses(lecturer.lecturerId, term.session.id);
  const ids = courses.map((course) => course.id);
  const scoreRows = ids.length ? await db.select({
    courseId: results.courseId, totalScore: results.totalScore, grade: results.grade, status: results.status,
  }).from(results).where(inArray(results.courseId, ids)) : [];
  const scored = scoreRows.filter((row) => row.totalScore !== null);
  const average = scored.length ? scored.reduce((sum, row) => sum + (row.totalScore ?? 0), 0) / scored.length : 0;
  const passes = scored.filter((row) => (row.totalScore ?? 0) >= 40).length;
  const distribution = ["A", "B", "C", "D", "E", "F"].map((grade) => ({ grade, count: scored.filter((row) => row.grade === grade).length }));

  return (
    <>
      <PageHeader eyebrow="Course analytics" title="Student performance summary"
        description="Read-only summaries across courses allocated to you. Draft scores are included only for lecturer planning; students see approved results only." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Assigned courses" value={courses.length} icon="📚" />
        <StatCard label="Score records" value={scored.length} icon="✍️" tone="blue" />
        <StatCard label="Class average" value={average.toFixed(1)} hint="Out of 100" icon="◈" tone="purple" />
        <StatCard label="Pass rate" value={`${scored.length ? Math.round((passes / scored.length) * 100) : 0}%`} hint="Total score ≥ 40" icon="✓" tone="green" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Per-course performance">
          {courses.length ? (
            <Table headers={["Code", "Course", "Students", "Scored", "Average", "Pass rate", "Status"]}>
              {courses.map((course) => {
                const rows = scoreRows.filter((row) => row.courseId === course.id && row.totalScore !== null);
                const pass = rows.filter((row) => (row.totalScore ?? 0) >= 40).length;
                const avg = rows.length ? rows.reduce((sum, row) => sum + (row.totalScore ?? 0), 0) / rows.length : 0;
                const rate = rows.length ? Math.round((pass / rows.length) * 100) : 0;
                return <tr key={course.id}><td className="strong">{course.code}</td><td>{course.title}</td><td>{course.student_count}</td><td>{rows.length}</td><td>{avg.toFixed(1)}</td><td><Badge tone={rate >= 60 ? "green" : "amber"}>{rate}%</Badge></td><td>{course.submission_status}</td></tr>;
              })}
            </Table>
          ) : <EmptyState title="No course data" description="Performance summaries appear once courses are allocated." />}
        </Panel>
        <Panel title="Grade distribution">
          {scored.length ? (
            <div className="space-y-4">
              {distribution.map((item) => (
                <div key={item.grade}>
                  <div className="mb-1 flex justify-between text-sm font-semibold text-slate-700"><span>Grade {item.grade}</span><span>{item.count}</span></div>
                  <ProgressBar value={item.count} max={Math.max(...distribution.map((d) => d.count), 1)} />
                </div>
              ))}
            </div>
          ) : <EmptyState title="No scores yet" description="Enter CA and exam scores to see the distribution." />}
        </Panel>
      </div>
    </>
  );
}
