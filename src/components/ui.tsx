import Link from "next/link";
import { FieldError } from "./ActionForm";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-slate-900 md:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-center">
      <p className="font-medium text-slate-700">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Field({
  label, name, type = "text", defaultValue, placeholder, required, hint, inputMode, as, children, rows, dir,
}: {
  label: string; name: string; type?: string; defaultValue?: string | number | null; placeholder?: string; required?: boolean;
  hint?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]; as?: "textarea" | "select"; children?: React.ReactNode; rows?: number; dir?: "ltr" | "rtl";
}) {
  const id = `f-${name}`;
  return (
    <div>
      <label htmlFor={id} className="label">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {as === "textarea" ? (
        <textarea id={id} name={name} defaultValue={defaultValue ?? undefined} placeholder={placeholder} rows={rows ?? 3} className="input" />
      ) : as === "select" ? (
        <select id={id} name={name} defaultValue={defaultValue ?? undefined} className="input">{children}</select>
      ) : (
        <input id={id} name={name} type={type} defaultValue={defaultValue ?? undefined} placeholder={placeholder} inputMode={inputMode} dir={dir} className="input" />
      )}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      <FieldError name={name} />
    </div>
  );
}

const tones = {
  gray: "bg-slate-100 text-slate-700",
  blue: "bg-brand-100 text-brand-700",
  green: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-rose-100 text-rose-800",
  violet: "bg-violet-100 text-violet-800",
} as const;
export type Tone = keyof typeof tones;
export function Badge({ tone = "gray", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`badge ${tones[tone]}`}>{children}</span>;
}

export const SampleBadge = () => <Badge tone="amber">داده نمونه</Badge>;

export function Stat({ label, value, hint, href }: { label: string; value: React.ReactNode; hint?: string; href?: string }) {
  const body = (
    <div className="card h-full">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
  return href ? <Link href={href} className="block transition hover:-translate-y-0.5">{body}</Link> : body;
}

export function Section({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-bold text-slate-900">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}
