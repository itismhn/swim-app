import Link from "next/link";
import { ArrowLeft, Mail, MapPin, Phone } from "lucide-react";
import { db } from "@/server/db";
import { PageHero } from "../shared";
import { toLatinDigits } from "@/lib/domain/performance";
export const metadata = { title: "تماس با ما" };

export default async function Contact() {
  const s = await db.academySetting.findUnique({ where: { id: 1 } });
  const items = [
    { icon: Phone, label: "تلفن", value: s?.contactPhone, ltr: true, href: s?.contactPhone ? `tel:${toLatinDigits(s.contactPhone).replace(/[^\d+]/g, "")}` : undefined },
    { icon: Mail, label: "ایمیل", value: s?.contactEmail, ltr: true, href: s?.contactEmail ? `mailto:${s.contactEmail}` : undefined },
    { icon: MapPin, label: "نشانی", value: s?.contactAddress },
  ];
  return (
    <>
      <PageHero eyebrow="ارتباط" title="تماس با ما">برای هماهنگی، پرسش یا بازدید از استخر با ما در ارتباط باشید.</PageHero>
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-4 md:grid-cols-3">
          {items.map((i) => {
            const body = (
              <>
                <span aria-hidden className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:text-brand-400"><i.icon className="size-5" /></span>
                <p className="mt-4 text-sm text-slate-500">{i.label}</p>
                <p dir={i.ltr ? "ltr" : undefined} className={`mt-1 font-bold text-ink ${i.ltr ? "text-end" : ""}`}>{i.value ?? "—"}</p>
              </>
            );
            return i.href ? <a key={i.label} href={i.href} className="card card-hover block p-6">{body}</a> : <div key={i.label} className="card p-6">{body}</div>;
          })}
        </div>
        <div className="card mt-6 flex flex-wrap items-center justify-between gap-4 p-6">
          <p className="text-slate-600">برای ثبت‌نام یا مشاوره اولیه از فرم درخواست استفاده کنید.</p>
          <Link href="/register" className="btn-primary">فرم درخواست <ArrowLeft aria-hidden /></Link>
        </div>
      </div>
    </>
  );
}
