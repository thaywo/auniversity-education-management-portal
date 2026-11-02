"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionResult, ScoreEntry } from "@/app/actions";
import type { RosterRow } from "@/lib/data";
import { Badge, StatusBadge } from "@/components/ui";

type Band = { grade: string; minScore: number; maxScore: number; gradePoint: number };

function bandFor(total: number, scale: Band[]) {
  return [...scale].sort((a, b) => b.minScore - a.minScore)
    .find((band) => total >= band.minScore && total <= band.maxScore) ?? { grade: "F", gradePoint: 0 };
}

export default function ScoreEditor({ courseId, courseLabel, rows, locked, status, feedback, scale, action }: {
  courseId: number;
  courseLabel: string;
  rows: RosterRow[];
  locked: boolean;
  status: string;
  feedback: string | null;
  scale: Band[];
  action: (courseId: number, entries: ScoreEntry[], mode: "draft" | "submit") => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [scores, setScores] = useState<Record<number, { ca: string; exam: string }>>(() =>
    Object.fromEntries(rows.map((row) => [row.registrationId, {
      ca: row.caScore === null ? "" : String(row.caScore),
      exam: row.examScore === null ? "" : String(row.examScore),
    }])),
  );

  function update(registrationId: number, key: "ca" | "exam", value: string) {
    setScores((current) => ({ ...current, [registrationId]: { ...current[registrationId], [key]: value } }));
  }

  const entries: ScoreEntry[] = rows.map((row) => ({
    registrationId: row.registrationId,
    ca: scores[row.registrationId]?.ca ?? "",
    exam: scores[row.registrationId]?.exam ?? "",
  }));
  const complete = entries.filter((entry) => {
    const ca = Number(entry.ca), exam = Number(entry.exam);
    return entry.ca.trim() !== "" && entry.exam.trim() !== "" &&
      ca >= 0 && ca <= 30 && exam >= 0 && exam <= 70;
  }).length;

  function save(mode: "draft" | "submit") {
    if (mode === "submit" && !window.confirm("Submit these results for departmental review? Submitted scores will be locked until an administrator reopens them.")) return;
    setResult(null);
    startTransition(async () => {
      const response = await action(courseId, entries, mode);
      setResult(response);
      if (response.ok) router.refresh();
    });
  }

  return (
    <div>
      {result && <div className={`uemp-alert uemp-alert-${result.ok ? "success" : "error"}`} role="status">{result.message}</div>}
      {feedback && (
        <div className="uemp-alert uemp-alert-info"><strong>Departmental feedback:</strong> {feedback}</div>
      )}
      {locked && (
        <div className="uemp-alert uemp-alert-error">
          This submission is <strong>{status}</strong> and locked. Only a Department Admin can reopen approved results for correction.
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">{courseLabel}</p>
          <p className="text-xs text-slate-500">CA is scored out of 30 and examination out of 70. Grades use the configurable university scale.</p>
        </div>
        <div className="w-full max-w-[220px]">
          <div className="mb-1 flex justify-between text-xs font-semibold text-slate-600"><span>Scores completed</span><span>{complete} / {rows.length}</span></div>
          <div className="uemp-progress"><span style={{ width: `${rows.length ? (complete / rows.length) * 100 : 0}%` }} /></div>
        </div>
      </div>

      <div className="uemp-table-wrap">
        <table className="uemp-table" style={{ minWidth: 850 }}>
          <thead>
            <tr><th>Matric Number</th><th>Student</th><th>Level</th><th>CA / 30</th><th>Exam / 70</th><th>Total</th><th>Grade</th><th>Record</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const current = scores[row.registrationId] ?? { ca: "", exam: "" };
              const ca = current.ca === "" ? null : Number(current.ca);
              const exam = current.exam === "" ? null : Number(current.exam);
              const valid = ca !== null && exam !== null && ca >= 0 && ca <= 30 && exam >= 0 && exam <= 70;
              const total = valid ? (ca ?? 0) + (exam ?? 0) : null;
              const band = total === null ? null : bandFor(total, scale);
              return (
                <tr key={row.registrationId}>
                  <td className="strong">{row.matricNumber}</td>
                  <td className="strong">{row.fullName}</td>
                  <td>{row.level}</td>
                  <td><input className="uemp-input !w-24" type="number" min={0} max={30} value={current.ca}
                    disabled={locked || pending} onChange={(event) => update(row.registrationId, "ca", event.target.value)} aria-label={`CA score for ${row.fullName}`} /></td>
                  <td><input className="uemp-input !w-24" type="number" min={0} max={70} value={current.exam}
                    disabled={locked || pending} onChange={(event) => update(row.registrationId, "exam", event.target.value)} aria-label={`Exam score for ${row.fullName}`} /></td>
                  <td className="strong">{total ?? "—"}</td>
                  <td>{band ? <Badge tone={band.grade === "F" ? "red" : "green"}>{band.grade} · {band.gradePoint}pt</Badge> : "—"}</td>
                  <td><StatusBadge status={row.resultStatus ?? "not entered"} /></td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={8} className="py-8 text-center text-slate-500">No students have registered for this course yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="no-print mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-500">Every save, submission and correction is recorded in the audit trail with the actor and score changes.</div>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/exports?type=class-list&courseId=${courseId}`} className="uemp-btn uemp-btn-ghost">Download class list</a>
          <button type="button" onClick={() => window.print()} className="uemp-btn uemp-btn-ghost">Print sheet</button>
          <button type="button" onClick={() => save("draft")} disabled={locked || pending || !rows.length} className="uemp-btn uemp-btn-navy">Save draft</button>
          <button type="button" onClick={() => save("submit")} disabled={locked || pending || !rows.length || complete !== rows.length}
            title={complete !== rows.length ? "Complete all scores before submitting" : "Submit for departmental review"}
            className="uemp-btn uemp-btn-primary">Submit for review</button>
        </div>
      </div>
    </div>
  );
}
