import { updateProfile } from "@/app/actions";
import { requireRole } from "@/lib/auth";
import { getStudentContext } from "@/lib/data";
import { ActionForm } from "@/components/forms";
import { Badge, KeyValue, PageHeader, Panel } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function StudentProfilePage() {
  const user = await requireRole(["student"]);
  const profile = await getStudentContext(user.id);
  if (!profile) return <Panel title="Profile missing"><p className="text-sm text-rose-600">No student record found.</p></Panel>;

  return (
    <>
      <PageHeader eyebrow="My profile" title="Personal & academic information"
        description="You may update permitted contact information. Academic identity and grades are controlled by your department." />
      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <Panel title="Edit permitted profile fields" subtitle="Matriculation number, department, program, level and results are read-only">
          <ActionForm action={updateProfile} submitLabel="Save profile changes" fields={[
            { name: "phone", label: "Phone number", type: "text", defaultValue: profile.phone ?? "", placeholder: "+234 ..." },
            { name: "gender", label: "Gender", type: "select", defaultValue: profile.gender ?? "", options: [{ value: "Female", label: "Female" }, { value: "Male", label: "Male" }, { value: "Other", label: "Other" }] },
            { name: "guardian_phone", label: "Guardian / next of kin phone", type: "text", defaultValue: profile.guardianPhone ?? "" },
            { name: "address", label: "Contact address", type: "textarea", defaultValue: profile.address ?? "", full: true, rows: 3 },
          ]} />
        </Panel>
        <div className="space-y-6">
          <Panel title="Account information">
            <KeyValue items={[
              { label: "Full name", value: profile.fullName }, { label: "Email", value: profile.email },
              { label: "Role", value: <Badge tone="blue">Student</Badge> },
              { label: "Account status", value: <Badge tone={profile.status === "active" ? "green" : "red"}>{profile.status}</Badge> },
            ]} />
          </Panel>
          <Panel title="Academic identity (read-only)">
            <KeyValue items={[
              { label: "Matriculation number", value: profile.matricNumber },
              { label: "Faculty", value: profile.faculty },
              { label: "Department", value: profile.department },
              { label: "Program", value: `${profile.degree} ${profile.program}` },
              { label: "Level", value: `${profile.level} Level` },
              { label: "Admission year", value: profile.admissionYear },
            ]} />
            <div className="uemp-alert uemp-alert-info mt-5 mb-0">To correct an academic record, contact your Department Admin. Students cannot modify their own grades or academic records.</div>
          </Panel>
        </div>
      </div>
    </>
  );
}
