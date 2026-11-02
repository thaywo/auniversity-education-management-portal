import Link from "next/link";
import { registerCourses, dropRegistration } from "@/app/actions";
import { requireRole } from "@/lib/auth";
import { getCurrentTerm, getStudentContext, getRegisteredCourses, getAvailableCourses } from "@/lib/data";
import { hasPermission } from "@/lib/permissions";
import CourseRegistrationForm from "@/components/CourseRegistrationForm";
import { RowForm } from "@/components/forms";
import { Badge, EmptyState, PageHeader, Panel, StatusBadge, Table } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function StudentCoursesPage() {
  const user = await requireRole(["student"]);
  const allowed = await hasPermission(user, "student.register");
  const profile = await getStudentContext(user.id);
  if (!profile) return <Panel title="Profile missing"><p className="text-sm text-rose-600">No student record found.</p></Panel>;
  const term = await getCurrentTerm();
  const registered = await getRegisteredCourses(profile.studentId, term.session.id, term.semester.id);
  const available = await getAvailableCourses(profile, term.session.id, term.semester.id);
  const currentUnits = registered.reduce((sum, course) => sum + course.units, 0);

  return (
    <>
      <PageHeader eyebrow="Workflow 1 · Course registration" title="Course registration"
        description={`Eligible courses are filtered by ${profile.department}, ${profile.program}, ${profile.level} Level and ${term.semester.name}. Duplicates and registrations above 24 units are rejected by the server.`}
        actions={<><a href="/api/exports?type=registration" className="uemp-btn uemp-btn-ghost">Download summary</a><Link href="/student/documents" className="uemp-btn uemp-btn-navy">Print summary</Link></>} />

      {!allowed && <div className="uemp-alert uemp-alert-error">Course registration has been disabled for the Student role by a Super Admin. You can still view your existing registrations.</div>}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Panel><p className="uemp-stat-label">Current term</p><p className="mt-2 text-lg font-bold text-slate-900">{term.session.name}</p><p className="text-sm text-slate-500">{term.semester.name}</p></Panel>
        <Panel><p className="uemp-stat-label">Registered courses</p><p className="uemp-stat-value">{registered.length}</p><p className="text-xs text-slate-500">{currentUnits} credit units</p></Panel>
        <Panel><p className="uemp-stat-label">Available to add</p><p className="uemp-stat-value">{available.length}</p><p className="text-xs text-slate-500">Eligibility-checked courses</p></Panel>
      </div>

      <Panel title="Available courses" subtitle="Select one or more courses and submit your registration" className="mb-6">
        {allowed ? (
          <CourseRegistrationForm courses={available} currentUnits={currentUnits} action={registerCourses} />
        ) : available.length ? (
          <Table headers={["Code", "Course", "Units", "Program"]}>
            {available.map((course) => <tr key={course.id}><td className="strong">{course.code}</td><td>{course.title}</td><td>{course.units}</td><td>{course.program ?? "All programs"}</td></tr>)}
          </Table>
        ) : <EmptyState title="Nothing to register" description="You have registered every eligible course for this semester." />}
      </Panel>

      <Panel title="My registered courses" subtitle="Courses already on your registration summary"
        actions={<Badge tone="blue">{currentUnits} / 24 units</Badge>}>
        {registered.length ? (
          <Table headers={["Code", "Course title", "Units", "Level", "Lecturer", "Record", "Action"]}>
            {registered.map((course) => (
              <tr key={course.registrationId}>
                <td className="strong">{course.code}</td><td>{course.title}</td><td>{course.units}</td><td>{course.level}</td>
                <td>{course.lecturer ?? "—"}</td>
                <td><StatusBadge status={course.status === "approved" ? "approved" : course.resultId ? "submitted" : "registered"} /></td>
                <td>{course.resultId || !allowed ? <span className="text-xs text-slate-400">Locked</span> :
                  <RowForm action={dropRegistration} hidden={{ registrationId: course.registrationId }} label="Drop" tone="danger"
                    confirm={`Remove ${course.code} from your registration?`} />}</td>
              </tr>
            ))}
          </Table>
        ) : <EmptyState title="No courses registered" description="Use the list above to register for this semester." />}
      </Panel>
    </>
  );
}
