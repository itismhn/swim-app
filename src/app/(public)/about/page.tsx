import { HeartPulse, ShieldCheck, Target, Waves } from "lucide-react";
import { db } from "@/server/db";
import { PageHero } from "../shared";
export const metadata = { title: "درباره ما" };

export default async function About() {
  const s = await db.academySetting.findUnique({ where: { id: 1 } });
  const pillars = [
    { icon: Waves, title: "تخصص در هر چهار شنا", body: "کرال سینه، کرال پشت، قورباغه و پروانه — با برنامه‌های تخصص‌محور." },
    { icon: Target, title: "برنامه‌ریزی فصلی", body: "تمرین بر اساس فصل، اهداف فصلی و مسابقات هدف طراحی می‌شود." },
    { icon: ShieldCheck, title: "حریم خصوصی", body: "اطلاعات شخصی فقط با رضایت سرپرست و با دسترسی محدود نگهداری می‌شود." },
    { icon: HeartPulse, title: "سلامت در اولویت", body: "هیچ رژیم محدودکننده یا هدف کاهش وزن به‌طور پیش‌فرض فعال نیست." },
  ];
  return (
    <>
      <PageHero eyebrow="درباره ما" title={`درباره ${s?.academyName ?? "آکادمی"}`}>
        آکادمی ما بر آموزش شنای رقابتی برای نوجوانان تمرکز دارد. برنامه‌های تمرینی بر اساس فصل، اهداف فصلی و مسابقات هدف طراحی می‌شوند و در هر چهار شنا تخصص‌محور هستند.
      </PageHero>
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-4 sm:grid-cols-2">
          {pillars.map((p) => (
            <div key={p.title} className="card flex gap-4 p-6">
              <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:text-brand-400"><p.icon className="size-5" /></span>
              <div><h2 className="font-bold">{p.title}</h2><p className="mt-1.5 text-sm leading-7 text-slate-600">{p.body}</p></div>
            </div>
          ))}
        </div>
        <p className="mt-8 max-w-3xl leading-8 text-slate-600">
          سلامت و امنیت ورزشکاران نوجوان اولویت ماست: اطلاعات شخصی فقط با رضایت سرپرست و با دسترسی محدود نگهداری می‌شود، ارتباط مربی با ورزشکاران زیر ۱۸ سال تحت نظارت والدین است و هیچ رژیم محدودکننده یا هدف کاهش وزن به‌طور پیش‌فرض فعال نیست.
        </p>
      </div>
    </>
  );
}
