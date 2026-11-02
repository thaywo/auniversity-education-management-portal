import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, actions }: {
  eyebrow?: string; title: string; description?: string; actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="mb-1 text-[11px] font-bold uppercase tracking-[.16em] text-emerald-700">{eyebrow}</p>}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, subtitle, actions, children, className = "", bodyClass = "" }: {
  title?: string; subtitle?: string; actions?: ReactNode; children: ReactNode;
  className?: string; bodyClass?: string;
}) {
  return (
    <section className={`uemp-panel ${className}`}>
      {(title || actions) && (
        <div className="uemp-panel-header">
          <div>
            {title && <h2 className="uemp-title">{title}</h2>}
            {subtitle && <p className="uemp-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={`uemp-panel-body ${bodyClass}`}>{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint, tone = "green", icon }: {
  label: string; value: ReactNode; hint?: string; tone?: "green" | "blue" | "amber" | "purple" | "red"; icon?: string;
}) {
  const colors: Record<string, string> = {
    green: "text-emerald-700 bg-emerald-50", blue: "text-blue-700 bg-blue-50",
    amber: "text-amber-700 bg-amber-50", purple: "text-purple-700 bg-purple-50",
    red: "text-rose-700 bg-rose-50",
  };
  return (
    <div className="uemp-stat">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="uemp-stat-label">{label}</p>
          <p className="uemp-stat-value text-slate-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        {icon && <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg ${colors[tone]}`}>{icon}</span>}
      </div>
    </div>
  );
}

export type BadgeTone = "green" | "amber" | "red" | "blue" | "slate" | "purple";
export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: BadgeTone }) {
  return <span className={`uemp-badge uemp-badge-${tone}`}>{children}</span>;
}

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const value = (status ?? "pending").toLowerCase();
  const tone: BadgeTone =
    ["approved", "active", "registered", "published", "complete"].includes(value) ? "green" :
    ["submitted", "pending", "draft", "current"].includes(value) ? "amber" :
    ["returned", "rejected", "suspended", "inactive", "locked"].includes(value) ? "red" :
    ["review", "oversight"].includes(value) ? "blue" : "slate";
  return <Badge tone={tone}>{value.replaceAll("_", " ")}</Badge>;
}

export function EmptyState({ title, description, icon = "📋" }: { title: string; description?: string; icon?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-2xl">{icon}</span>
      <p className="font-semibold text-slate-700">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>}
    </div>
  );
}

export function KeyValue({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="uemp-kv">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl bg-slate-50 px-4 py-3">
          <dt>{item.label}</dt>
          <dd>{item.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ProgressBar({ value, max = 100 }: { value: number; max?: number }) {
  const percent = max ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return <div className="uemp-progress"><span style={{ width: `${percent}%` }} /></div>;
}

export function Table({ headers, children, minWidth = 640 }: { headers: string[]; children: ReactNode; minWidth?: number }) {
  return (
    <div className="uemp-table-wrap">
      <table className="uemp-table" style={{ minWidth }}>
        <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
