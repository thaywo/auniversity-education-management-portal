import { requireRole } from "@/lib/auth";
import { getLecturerContext } from "@/lib/data";
import { Badge, KeyValue, PageHeader, Panel } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function LecturerProfilePage() {
  const user = await requireRole(["lecturer"]);
  const lecturer = await getLecturerContext(user.id);
  if (!lecturer) return <Panel title="Profile missing"><p className="text-sm text-rose-600">No lecturer record found.</p></Panel>;

  return (
    <>
      <PageHeader eyebrow="Account" title="Lecturer profile" description="Your institutional identity and teaching assignment." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Personal & account details"><KeyValue items={[
          { label: "Full name", value: lecturer.fullName }, { label: "Email", value: lecturer.email },
          { label: "Phone", value: lecturer.phone ?? "—" }, { label: "Staff number", value: lecturer.staffNumber },
          { label: "Role", value: <Badge tone="blue">Lecturer</Badge> }, { label: "Status", value: <Badge tone={lecturer.status === "active" ? "green" : "red"}>{lecturer.status}</Badge> },
        ]} /></Panel>
        <Panel title="Departmental assignment"><KeyValue items={[
          { label: "Department", value: lecturer.department }, { label: "Designation", value: lecturer.designation },
          { label: "Qualification", value: lecturer.qualification ?? "—" }, { label: "Access scope", value: "Assigned courses only" },
        ]} />
          <div className="uemp-alert uemp-alert-info mt-5 mb-0">Profile changes and course allocations are managed by your Department Admin or the Super Admin. Lecturers cannot modify courses or students outside assigned responsibilities.</div>
        </Panel>
      </div>
    </>
  );
}
