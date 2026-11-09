import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { db } from "@/server/db";
import { PageHero } from "../shared";
export const metadata = { title: "سؤالات متداول" };

export default async function Faq() {
  const faqs = await db.faq.findMany({ orderBy: { order: "asc" } });
  return (
    <>
      <PageHero eyebrow="راهنما" title="سؤالات متداول">پاسخ پرتکرارترین پرسش‌های خانواده‌ها درباره ثبت‌نام، تمرین و سامانه.</PageHero>
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-surface shadow-card">
          {faqs.map((f) => (
            <details key={f.id} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-ink transition hover:bg-slate-50">
                {f.question}
                <ChevronDown aria-hidden className="size-5 shrink-0 text-slate-400 transition group-open:rotate-180 group-open:text-brand-600 dark:text-brand-400" />
              </summary>
              <p className="px-5 pb-5 text-sm leading-7 text-slate-600">{f.answer}</p>
            </details>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-slate-500">پاسخ خود را پیدا نکردید؟ <Link href="/contact" className="link">با ما تماس بگیرید</Link></p>
      </div>
    </>
  );
}
