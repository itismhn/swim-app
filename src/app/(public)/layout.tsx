import Link from "next/link";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

const nav = [
  ["/", "خانه"], ["/about", "درباره ما"], ["/coaches", "مربیان و گروه‌ها"], ["/programs", "برنامه‌ها"], ["/faq", "سؤالات متداول"], ["/contact", "تماس"],
] as const;

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const s = await db.academySetting.findUnique({ where: { id: 1 } });
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-brand-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-brand-700">
            <span aria-hidden className="grid size-9 place-items-center rounded-xl bg-brand-600 text-white">〰</span>
            {s?.academyName ?? "آکادمی شنا"}
          </Link>
          <nav aria-label="منوی اصلی" className="hidden gap-4 text-sm md:flex">
            {nav.map(([href, label]) => <Link key={href} href={href} className="text-slate-600 hover:text-brand-600">{label}</Link>)}
          </nav>
          <div className="flex gap-2">
            <Link href="/register" className="btn-primary btn-sm">درخواست ثبت‌نام</Link>
            <Link href="/login" className="btn-secondary btn-sm">ورود</Link>
          </div>
        </div>
        <nav aria-label="منوی اصلی موبایل" className="flex gap-4 overflow-x-auto border-t border-slate-100 px-4 py-2 text-sm md:hidden">
          {nav.map(([href, label]) => <Link key={href} href={href} className="shrink-0 text-slate-600">{label}</Link>)}
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-slate-500">
          <p>{s?.academyName} — {s?.contactAddress}</p>
          <p className="mt-1">محتوای این وب‌سایت عمومی است و هیچ اطلاعات خصوصی ورزشکاران در آن نمایش داده نمی‌شود.</p>
        </div>
      </footer>
    </div>
  );
}
