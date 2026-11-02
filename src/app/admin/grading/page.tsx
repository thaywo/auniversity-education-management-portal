import { updateGradingBand } from "@/app/actions";
import { requireRole } from "@/lib/auth";
import { getGradeBands } from "@/lib/manage-data";
import { ActionForm } from "@/components/forms";
import { Badge, PageHeader, Panel } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminGradingPage() {
  await requireRole(["super_admin"]);
  const bands = await getGradeBands();

  return (
    <>
      <PageHeader eyebrow="Academic policy" title="Configurable grading scale"
        description="Adjust inclusive score thresholds and grade points. All new result calculations and GPA computations use the saved scale immediately." />
      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <Panel title="Grade bands" subtitle="CA maximum 30 · Examination maximum 70 · Total maximum 100">
          <div className="grid gap-4 sm:grid-cols-2">
            {bands.map((band) => (
              <div key={band.id} className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div><p className="text-lg font-black text-slate-900">Grade {band.grade}</p><p className="text-xs text-slate-500">{band.minScore} – {band.maxScore} · {band.gradePoint} points</p></div>
                  <Badge tone={band.grade === "F" ? "red" : "green"}>{band.remark ?? band.grade}</Badge>
                </div>
                <ActionForm action={updateGradingBand} hidden={{ id: band.id }} submitLabel="Update band" buttonTone="ghost" compact fields={[
                  { name: "minScore", label: "Minimum score", type: "number", required: true, min: 0, max: band.maxScore, defaultValue: band.minScore },
                  { name: "gradePoint", label: "Grade point", type: "number", required: true, min: 0, max: 5, defaultValue: band.gradePoint },
                ]} />
              </div>
            ))}
          </div>
        </Panel>
        <div className="space-y-6">
          <Panel title="Documented grading scale">
            <div className="space-y-2">
              {bands.map((band) => <div key={band.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"><span className="font-semibold text-slate-800">{band.minScore} – {band.maxScore}</span><span className="text-slate-600">Grade {band.grade} · {band.gradePoint} pt</span></div>)}
            </div>
          </Panel>
          <Panel title="GPA calculation">
            <div className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">GPA = Σ(credit units × grade point) ÷ Σ(credit units)</div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">CGPA uses every approved result across all semesters. Failed courses carry zero grade points but still contribute their credit units. The classification bands are First Class ≥ 4.50, Second Class Upper ≥ 3.50, Second Class Lower ≥ 2.50 and Third Class ≥ 1.50.</p>
            <div className="uemp-alert uemp-alert-info mt-4 mb-0">Changing thresholds does not rewrite already approved results; it applies to new score entries and corrections. Every scale update is audited.</div>
          </Panel>
        </div>
      </div>
    </>
  );
}
