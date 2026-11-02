"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionResult } from "@/app/actions";

export type RegistrationCourse = {
  id: number; code: string; title: string; units: number; level: number;
  program: string | null; lecturer: string | null;
};

export default function CourseRegistrationForm({ courses, currentUnits, maxUnits = 24, action }: {
  courses: RegistrationCourse[];
  currentUnits: number;
  maxUnits?: number;
  action: (formData: FormData) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<number[]>([]);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  const selectedUnits = courses.filter((course) => selected.includes(course.id)).reduce((sum, course) => sum + course.units, 0);
  const overLimit = currentUnits + selectedUnits > maxUnits;

  function toggle(id: number) {
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
    setFeedback(null);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected.length || overLimit) return;
    setFeedback(null);
    startTransition(async () => {
      const formData = new FormData();
      selected.forEach((id) => formData.append("courseId", String(id)));
      const result = await action(formData);
      setFeedback(result);
      if (result.ok) {
        setSelected([]);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={submit}>
      {feedback && <div className={`uemp-alert uemp-alert-${feedback.ok ? "success" : "error"}`} role="status">{feedback.message}</div>}
      <div className="uemp-table-wrap">
        <table className="uemp-table" style={{ minWidth: 700 }}>
          <thead><tr><th style={{ width: 50 }}>Select</th><th>Code</th><th>Course title</th><th>Units</th><th>Program</th><th>Lecturer</th></tr></thead>
          <tbody>
            {courses.map((course) => (
              <tr key={course.id} className={selected.includes(course.id) ? "!bg-emerald-50/60" : ""}>
                <td>
                  <input type="checkbox" className="h-4 w-4 accent-emerald-600" checked={selected.includes(course.id)}
                    onChange={() => toggle(course.id)} aria-label={`Select ${course.code}`} />
                </td>
                <td className="strong">{course.code}</td>
                <td className="strong">{course.title}</td>
                <td>{course.units}</td>
                <td>{course.program ?? "All departmental programs"}</td>
                <td>{course.lecturer ?? "To be allocated"}</td>
              </tr>
            ))}
            {!courses.length && <tr><td colSpan={6} className="py-8 text-center text-slate-500">No additional eligible courses are available for your level and semester.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-600">
          <strong>{selected.length}</strong> selected · <strong>{currentUnits + selectedUnits}</strong> / {maxUnits} credit units
          {overLimit && <span className="ml-2 font-semibold text-rose-600">Credit limit exceeded</span>}
        </div>
        <button type="submit" disabled={pending || !selected.length || overLimit || !courses.length} className="uemp-btn uemp-btn-primary">
          {pending ? "Registering…" : "Register selected courses"}
        </button>
      </div>
    </form>
  );
}
