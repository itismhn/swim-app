import Link from "next/link";
import { ChevronLeft, Inbox, type LucideIcon } from "lucide-react";
import { FieldError } from "./ActionForm";

export function PageHeader({ title, subtitle, actions, eyebrow }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode; eyebrow?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 animate-fade-up">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="text-2xl font-extrabold tracking-tight text-ink md:text-[1.75rem]">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Empty({ title, hint, action, icon: Icon = Inbox }: { title: string; hint?: string; action?: React.ReactNode; icon?: LucideIcon }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-8 text-center">
      <span aria-hidden className="mb-3 grid size-11 place-items-center rounded-xl bg-surface text-slate-400 shadow-sm ring-1 ring-slate-200">
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-slate-500">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Field({
  label, name, type = "text", defaultValue, placeholder, required, hint, inputMode, as, children, rows, dir, autoComplete,
}: {
  label: string; name: string; type?: string; defaultValue?: string | number | null; placeholder?: string; required?: boolean;
  hint?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]; as?: "textarea" | "select"; children?: React.ReactNode; rows?: number; dir?: "ltr" | "rtl";
  autoComplete?: string;
}) {
  const id = `f-${name}`;
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className="label">
        {label} {required && <span className="text-rose-500" aria-hidden>*</span>}
      </label>
      {as === "textarea" ? (
        <textarea id={id} name={name} defaultValue={defaultValue ?? undefined} placeholder={placeholder} rows={rows ?? 3} className="input" aria-describedby={hintId} aria-required={required} />
      ) : as === "select" ? (
        <select id={id} name={name} defaultValue={defaultValue ?? undefined} className="input" aria-describedby={hintId} aria-required={required}>{children}</select>
      ) : (
        <input id={id} name={name} type={type} defaultValue={defaultValue ?? undefined} placeholder={placeholder} inputMode={inputMode} dir={dir} autoComplete={autoComplete} className="input" aria-describedby={hintId} aria-required={required} />
      )}
      {hint && <p id={hintId} className="mt-1.5 text-xs text-slate-500">{hint}</p>}
      <FieldError name={name} />
    </div>
  );
}

const tones = {
  gray: "bg-slate-50 text-slate-700 ring-slate-200",
  blue: "bg-brand-50 text-brand-700 ring-brand-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-rose-50 text-rose-700 ring-rose-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
} as const;
export type Tone = keyof typeof tones;
export function Badge({ tone = "gray", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`badge ${tones[tone]}`}>{children}</span>;
}

export const SampleBadge = () => <Badge tone="amber">داده نمونه</Badge>;

const statTones = {
  blue: "bg-brand-50 text-brand-600 dark:text-brand-400 ring-brand-100",
  green: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  amber: "bg-amber-50 text-amber-600 ring-amber-100",
  violet: "bg-violet-50 text-violet-600 ring-violet-100",
  red: "bg-rose-50 text-rose-600 ring-rose-100",
} as const;

export function Stat({ label, value, hint, href, icon: Icon, tone = "blue" }: {
  label: string; value: React.ReactNode; hint?: string; href?: string; icon?: LucideIcon; tone?: keyof typeof statTones;
}) {
  const body = (
    <div className={`card group relative h-full overflow-hidden ${href ? "card-hover" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        {Icon && (
          <span aria-hidden className={`grid size-9 shrink-0 place-items-center rounded-xl ring-1 ${statTones[tone]}`}>
            <Icon className="size-[18px]" strokeWidth={2} />
          </span>
        )}
      </div>
      <div className="nums mt-2 text-2xl font-extrabold tracking-tight text-ink md:text-[1.7rem]">{value}</div>
      {hint && <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p>}
      {href && <ChevronLeft aria-hidden className="absolute bottom-4 end-4 size-4 text-slate-300 transition group-hover:-translate-x-0.5 group-hover:text-brand-500" />}
    </div>
  );
  return href ? <Link href={href} className="block rounded-2xl">{body}</Link> : body;
}

export function Section({ title, children, actions, icon: Icon, description }: {
  title: string; children: React.ReactNode; actions?: React.ReactNode; icon?: LucideIcon; description?: string;
}) {
  return (
    <section className="card">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {Icon && (
            <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
              <Icon className="size-4" strokeWidth={2} />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="font-bold text-ink">{title}</h2>
            {description && <p className="text-xs text-slate-500">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

/** Small "view all" link for section headers. */
export function MoreLink({ href, children = "همه" }: { href: string; children?: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-0.5 rounded-lg px-2 py-1 text-xs font-semibold text-brand-600 dark:text-brand-400 transition hover:bg-brand-50">
      {children}<ChevronLeft aria-hidden className="size-3.5" />
    </Link>
  );
}

/** Alert / callout box. */
export function Callout({ tone = "blue", title, children, icon: Icon }: { tone?: "blue" | "red" | "amber" | "green"; title?: string; children?: React.ReactNode; icon?: LucideIcon }) {
  const t = {
    blue: "border-brand-200 bg-brand-50 text-brand-900",
    red: "border-rose-200 bg-rose-50 text-rose-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    green: "border-emerald-200 bg-emerald-50 text-emerald-900",
  }[tone];
  return (
    <div role={tone === "red" ? "alert" : undefined} className={`flex gap-3 rounded-xl border p-3.5 text-sm ${t}`}>
      {Icon && <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />}
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "mt-1 opacity-90" : ""}>{children}</div>}
      </div>
    </div>
  );
}

const avatarTones = ["from-brand-100 to-brand-200 text-brand-800", "from-violet-100 to-violet-200 text-violet-800", "from-emerald-100 to-emerald-200 text-emerald-800", "from-amber-100 to-amber-200 text-amber-800", "from-rose-100 to-rose-200 text-rose-800"];
export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const parts = name.trim().split(/\s+/);
  const t = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const sz = { sm: "size-8 text-[11px]", md: "size-11 text-sm", lg: "size-16 text-xl" }[size];
  return <span aria-hidden className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-bold ${sz} ${avatarTones[h % avatarTones.length]}`}>{t}</span>;
}
