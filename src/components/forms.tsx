"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type ReactNode } from "react";
import type { ActionResult } from "@/app/actions";

export type FormField = {
  name: string;
  label: string;
  type?: "text" | "email" | "number" | "password" | "select" | "textarea" | "date";
  options?: { value: string | number; label: string }[];
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | number;
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  full?: boolean;
  hint?: string;
};

type Action = (formData: FormData) => Promise<ActionResult>;

function useActionRunner() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  function submit(action: Action, formData: FormData, onSuccess?: () => void) {
    setFeedback(null);
    startTransition(async () => {
      try {
        const result = await action(formData);
        setFeedback(result);
        if (result.ok) {
          onSuccess?.();
          router.refresh();
        }
      } catch {
        setFeedback({ ok: false, message: "The request could not be completed. Please try again." });
      }
    });
  }
  return { pending, feedback, submit, setFeedback };
}

export function Feedback({ feedback }: { feedback: ActionResult | null }) {
  if (!feedback) return null;
  return <div className={`uemp-alert uemp-alert-${feedback.ok ? "success" : "error"}`} role="status">{feedback.message}</div>;
}

export function ActionForm({ action, fields, hidden = {}, submitLabel = "Save", buttonTone = "primary", description, className = "", columns = 2, children, compact = false }: {
  action: Action;
  fields: FormField[];
  hidden?: Record<string, string | number>;
  submitLabel?: string;
  buttonTone?: "primary" | "navy" | "ghost" | "danger";
  description?: string;
  className?: string;
  columns?: 1 | 2 | 3;
  children?: ReactNode;
  compact?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const { pending, feedback, submit } = useActionRunner();
  const gridStyle = columns === 1 ? { gridTemplateColumns: "1fr" } : columns === 3 ? { gridTemplateColumns: "repeat(3,minmax(0,1fr))" } : undefined;
  return (
    <form ref={formRef} className={className} onSubmit={(event) => {
      event.preventDefault();
      submit(action, new FormData(event.currentTarget), () => formRef.current?.reset());
    }}>
      <Feedback feedback={feedback} />
      {description && <p className="mb-4 text-sm text-slate-500">{description}</p>}
      {Object.entries(hidden).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
      <div className="uemp-form-grid" style={gridStyle}>
        {fields.map((field) => (
          <div key={field.name} style={field.full ? { gridColumn: "1 / -1" } : undefined} className={compact ? "mb-2" : ""}>
            <label className="uemp-label" htmlFor={`af-${field.name}-${submitLabel.replace(/\s/g, "")}`}>{field.label}{field.required && <span className="ml-1 text-rose-500">*</span>}</label>
            {field.type === "select" ? (
              <select id={`af-${field.name}-${submitLabel.replace(/\s/g, "")}`} className="uemp-select" name={field.name}
                required={field.required} defaultValue={String(field.defaultValue ?? "")}>
                <option value="">Select…</option>
                {field.options?.map((option) => <option key={String(option.value)} value={option.value}>{option.label}</option>)}
              </select>
            ) : field.type === "textarea" ? (
              <textarea id={`af-${field.name}-${submitLabel.replace(/\s/g, "")}`} className="uemp-textarea" name={field.name}
                required={field.required} placeholder={field.placeholder} rows={field.rows ?? 3}
                defaultValue={String(field.defaultValue ?? "")} />
            ) : (
              <input id={`af-${field.name}-${submitLabel.replace(/\s/g, "")}`} className="uemp-input" name={field.name}
                type={field.type ?? "text"} required={field.required} placeholder={field.placeholder}
                min={field.min} max={field.max} step={field.step}
                defaultValue={field.defaultValue === undefined ? "" : String(field.defaultValue)} />
            )}
            {field.hint && <p className="mt-1 text-xs text-slate-400">{field.hint}</p>}
          </div>
        ))}
      </div>
      {children}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="submit" disabled={pending} className={`uemp-btn uemp-btn-${buttonTone}`}>
          {pending ? "Working…" : submitLabel}
        </button>
        <span className="text-xs text-slate-400">Changes are validated and audited on the server.</span>
      </div>
    </form>
  );
}

export function RowForm({ action, hidden, label, tone = "ghost", confirm, disabled = false, title }: {
  action: Action;
  hidden: Record<string, string | number>;
  label: string;
  tone?: "primary" | "navy" | "ghost" | "danger";
  confirm?: string;
  disabled?: boolean;
  title?: string;
}) {
  const { pending, feedback, submit } = useActionRunner();
  return (
    <form className="inline-block" onSubmit={(event) => {
      event.preventDefault();
      if (confirm && !window.confirm(confirm)) return;
      submit(action, new FormData(event.currentTarget));
    }}>
      {feedback && !feedback.ok && <span className="mr-2 text-xs text-rose-600" title={feedback.message}>⚠</span>}
      {Object.entries(hidden).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
      <button type="submit" disabled={pending || disabled} title={title ?? label}
        className={`uemp-btn uemp-btn-${tone} uemp-btn-sm`}>
        {pending ? "…" : label}
      </button>
    </form>
  );
}

export function PrintButton({ label = "Print / Save PDF" }: { label?: string }) {
  return <button type="button" onClick={() => window.print()} className="uemp-btn uemp-btn-navy no-print">{label}</button>;
}
