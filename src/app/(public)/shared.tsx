export const PUBLIC_NAV = [
  ["/", "خانه"], ["/about", "درباره ما"], ["/coaches", "مربیان و گروه‌ها"], ["/programs", "برنامه‌ها"], ["/faq", "سؤالات متداول"], ["/contact", "تماس"],
] as const;

/** Consistent hero band for inner public pages. */
export function PageHero({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b border-slate-200/70 bg-gradient-to-b from-brand-50 to-canvas">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-24 mx-auto size-[36rem] rounded-full bg-brand-200/40 blur-3xl" />
      <div className="relative mx-auto max-w-6xl px-4 py-14 md:py-20">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">{title}</h1>
        {children && <div className="mt-3 max-w-2xl text-base leading-8 text-slate-600">{children}</div>}
      </div>
    </section>
  );
}
