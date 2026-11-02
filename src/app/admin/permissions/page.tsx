import { togglePermission } from "@/app/actions";
import { requireRole } from "@/lib/auth";
import { getPermissionMatrix, PERMISSION_CATALOG } from "@/lib/permissions";
import { RowForm } from "@/components/forms";
import { Badge, PageHeader, Panel, Table } from "@/components/ui";

export const dynamic = "force-dynamic";

const roles = ["student", "lecturer", "dept_admin", "super_admin"] as const;
const labels: Record<string, string> = {
  student: "Student", lecturer: "Lecturer", dept_admin: "Dept Admin", super_admin: "Super Admin",
};

export default async function AdminPermissionsPage() {
  await requireRole(["super_admin"]);
  const matrix = await getPermissionMatrix();
  const lookup = new Map(matrix.map((row) => [`${row.role}:${row.permission}`, row.enabled]));

  return (
    <>
      <PageHeader eyebrow="Role-based access control" title="Roles & permissions matrix"
        description="Enable or disable granular capabilities for each role. The matrix is enforced inside Server Actions, not just in the interface." />
      <div className="uemp-alert uemp-alert-info">Super Admin permissions are fixed to preserve university-wide control and cannot be disabled. Changes to other roles take effect on the very next request.</div>
      <Panel title="Permission catalogue" subtitle="Rows show capability, intended role, and persisted enabled state">
        <Table headers={["Permission", "Description", ...roles.map((role) => labels[role])]} minWidth={980}>
          {PERMISSION_CATALOG.map((permission) => (
            <tr key={permission.key}>
              <td><code className="rounded bg-slate-100 px-2 py-1 text-[11px]">{permission.key}</code></td>
              <td>{permission.label}</td>
              {roles.map((role) => {
                const enabled = lookup.get(`${role}:${permission.key}`) ?? false;
                if (role === "super_admin") return <td key={role}><Badge tone="purple">Always on</Badge></td>;
                return (
                  <td key={role}>
                    <RowForm action={togglePermission} hidden={{ role, permission: permission.key }} label={enabled ? "Enabled" : "Disabled"}
                      tone={enabled ? "primary" : "ghost"} confirm={`${enabled ? "Disable" : "Enable"} ${permission.key} for ${labels[role]}?`} />
                  </td>
                );
              })}
            </tr>
          ))}
        </Table>
      </Panel>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Enforcement points">
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
            <li><code>requireRole()</code> protects each dashboard layout and redirects wrong-role visitors.</li>
            <li><code>requireActionUser()</code> independently re-reads the session for every mutation.</li>
            <li><code>requirePermission()</code> consults this table before course registration, result entry, review, structure and user management.</li>
            <li><code>resolveDepartment()</code> locks Department Admins to their assigned department.</li>
            <li>API exports re-check role, scope and (for lecturers) course allocation before returning data.</li>
          </ul>
        </Panel>
        <Panel title="Role summary">
          <div className="space-y-3">
            {[
              ["Student", "Own profile, eligible course registration, approved results, GPA and printable records."],
              ["Lecturer", "Assigned courses, class lists, CA/exam scores, drafts, submissions and performance summaries."],
              ["Department Admin", "Own department's students, lecturers, courses, programs, allocations, registrations, approvals and reports."],
              ["Super Admin", "All academic structure, users, roles/permissions, sessions, grading configuration, monitoring and reports."],
            ].map(([role, text]) => <div key={role} className="rounded-xl border border-slate-200 p-3"><p className="text-sm font-bold text-slate-800">{role}</p><p className="mt-1 text-xs text-slate-500">{text}</p></div>)}
          </div>
        </Panel>
      </div>
    </>
  );
}
