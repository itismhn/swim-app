import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock, Dumbbell, HeartPulse, MessageSquare, Ruler, ShieldCheck, Timer, Trophy, Waves } from "lucide-react";
import { db } from "@/server/db";
import { faNum } from "@/lib/domain/jalali";

const PROGRAM_ICONS = [Waves, Dumbbell, HeartPulse, Trophy];

export default async function Home() {
  const [programs, s] = await Promise.all([
    db.program.findMany({ orderBy: { order: "asc" }, take: 4 }),
    db.academySetting.findUnique({ where: { id: 1 } }),
  ]);
  const facts = [
    { icon: Ruler, label: "طول استخر", value: `${faNum(s?.poolLengthMeters ?? 25)} متر` },
    { icon: CalendarDays, label: "جلسات هفتگی", value: `${faNum(s?.sessionsPerWeek ?? 3)} جلسه` },
    { icon: Clock, label: "مدت هر جلسه", value: `${faNum(s?.sessionMinutes ?? 120)} دقیقه` },
  ];
  const features = [
    { icon: Timer, title: "پایش رکوردها", body: "ثبت زمان‌های رسمی و تمرینی، رکورد شخصی و نمودار پیشرفت در طول فصل." },
    { icon: CalendarDays, title: "برنامه و حضور", body: "تقویم جلسات، برنامه تمرین در آب و خشکی، و گزارش حضور شفاف." },
    { icon: MessageSquare, title: "ارتباط با خانواده", body: "پیام‌رسانی تحت نظارت سرپرست و اعلان‌های به‌موقع برای والدین." },
    { icon: ShieldCheck, title: "امنیت و حریم خصوصی", body: "دسترسی نقش‌محور؛ اطلاعات نوجوانان فقط با رضایت سرپرست نگهداری می‌شود." },
  ];
  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-brand-950 text-white">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(60rem_30rem_at_80%_-10%,rgb(19_143_192/.55),transparent),radial-gradient(40rem_24rem_at_0%_110%,rgb(47_171_217/.35),transparent)]" />
        {/* lane lines */}
        <div aria-hidden className="absolute inset-0 -z-10 opacity-[0.07] [background-image:repeating-linear-gradient(90deg,#fff_0_2px,transparent_2px_120px)]" />
        <svg aria-hidden viewBox="0 0 1440 120" className="absolute inset-x-0 bottom-0 -z-10 h-16 w-full text-canvas md:h-24" preserveAspectRatio="none">
          <path fill="currentColor" d="M0 64c120 26 240 40 360 32s240-40 360-40 240 32 360 40 240-8 360-24v48H0z" />
        </svg>
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-16 pb-28 md:grid-cols-[1.15fr_1fr] md:pt-24 md:pb-36">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-pool-100 backdrop-blur">
              <span className="size-1.5 rounded-full bg-lane" />شنای نوجوانان و رقابتی
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.35] tracking-tight text-white md:text-6xl md:leading-[1.25]">
              تمرین هدفمند،
              <br />
              <span className="bg-gradient-to-l from-pool-200 to-white bg-clip-text text-transparent">پیشرفت قابل اندازه‌گیری</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-pool-100/90 md:text-lg md:leading-9">
              برنامه‌های تخصصی هر چهار شنا، آمادگی جسمانی خشکی، آموزش تغذیه و پایش عملکرد در طول فصل — با ارتباط شفاف بین مربی، ورزشکار و خانواده.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/register" className="btn h-12 bg-white px-6 text-pool-800 shadow-lg shadow-brand-950/30 hover:bg-white/90">
                درخواست ثبت‌نام یا مشاوره <ArrowLeft aria-hidden />
              </Link>
              <Link href="/programs" className="btn h-12 border border-white/25 px-6 text-white hover:bg-white/10">مشاهده برنامه‌ها</Link>
            </div>
          </div>

          {/* Product preview card */}
          <div aria-hidden className="relative hidden md:block">
            <div className="absolute -inset-6 rounded-[2rem] bg-brand-400/20 blur-2xl" />
            <div className="relative rotate-[-2deg] rounded-3xl border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">۱۰۰ متر کرال سینه</p>
                <span className="rounded-full bg-lane/90 px-2 py-0.5 text-[11px] font-bold text-brand-950">PB</span>
              </div>
              <p dir="ltr" className="nums mt-3 text-end text-4xl font-extrabold text-white">1:02.48</p>
              <svg viewBox="0 0 300 90" className="mt-4 w-full">
                <defs>
                  <linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#6cc8ea" stopOpacity=".5" /><stop offset="1" stopColor="#6cc8ea" stopOpacity="0" /></linearGradient>
                </defs>
                <path d="M0 20 C40 26 60 34 90 40 S150 52 180 58 240 70 300 76 V90 H0Z" fill="url(#g)" />
                <path d="M0 20 C40 26 60 34 90 40 S150 52 180 58 240 70 300 76" fill="none" stroke="#a6dff4" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="300" cy="76" r="4" fill="#f4c430" />
              </svg>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[["حضور", "۹۴٪"], ["بهبود", "۳٫۲٪"], ["جلسات", "۲۴"]].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-white/10 p-2.5"><p className="text-[11px] text-pool-100">{k}</p><p className="nums mt-0.5 font-bold text-white">{v}</p></div>
                ))}
              </div>
            </div>
            <div className="absolute -bottom-6 -start-6 flex rotate-[3deg] items-center gap-3 rounded-2xl border border-white/15 bg-surface p-3 text-ink shadow-2xl">
              <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><CalendarDays className="size-5" /></span>
              <div><p className="text-xs text-slate-500">جلسه بعدی</p><p className="text-sm font-bold">شنبه · ۱۶:۳۰</p></div>
            </div>
          </div>
        </div>
      </section>

      {/* Facts */}
      <section className="relative z-10 mx-auto -mt-12 max-w-6xl px-4 md:-mt-16">
        <div className="grid gap-3 rounded-3xl border border-slate-200/80 bg-surface p-3 shadow-lift sm:grid-cols-3">
          {facts.map((f) => (
            <div key={f.label} className="flex items-center gap-4 rounded-2xl p-4">
              <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:text-brand-400"><f.icon className="size-6" strokeWidth={1.75} /></span>
              <div><p className="text-sm text-slate-500">{f.label}</p><p className="nums text-xl font-extrabold text-ink">{f.value}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* Programs */}
      {programs.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">خدمات ما</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight md:text-3xl">برنامه‌هایی برای هر مرحله از مسیر</h2>
            </div>
            <Link href="/programs" className="link inline-flex items-center gap-1 text-sm">همه برنامه‌ها <ArrowLeft aria-hidden className="size-4" /></Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {programs.map((p, i) => {
              const Icon = PROGRAM_ICONS[i % PROGRAM_ICONS.length];
              return (
                <article key={p.id} className="card card-hover group flex gap-4 p-6">
                  <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-pool-700 text-white shadow-md shadow-brand-950/15 transition group-hover:scale-105">
                    <Icon className="size-6" strokeWidth={1.9} />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold">{p.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{p.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 pt-20">
        <div className="max-w-2xl">
          <p className="eyebrow">سامانه آکادمی</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight md:text-3xl">همه‌چیز در یک داشبورد</h2>
          <p className="mt-3 leading-8 text-slate-600">مربیان، ورزشکاران و خانواده‌ها هرکدام نمای مخصوص خود را دارند؛ از برنامه هفتگی تا نمودار پیشرفت.</p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-200/80 bg-surface/60 p-5">
              <f.icon aria-hidden className="size-6 text-brand-600 dark:text-brand-400" strokeWidth={1.75} />
              <h3 className="mt-4 font-bold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-7 text-slate-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pt-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-brand-600 to-pool-800 px-6 py-12 text-white md:px-12">
          <div aria-hidden className="absolute -end-20 -top-20 size-72 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-xl">
              <h2 className="text-2xl font-extrabold text-white md:text-3xl">آماده‌اید شروع کنید؟</h2>
              <p className="mt-2 leading-8 text-pool-100">فرم کوتاه درخواست را پر کنید؛ برای ارزیابی ورودی با شما تماس می‌گیریم.</p>
            </div>
            <Link href="/register" className="btn h-12 bg-white px-6 text-pool-800 hover:bg-white/90">ثبت درخواست <ArrowLeft aria-hidden /></Link>
          </div>
        </div>
      </section>
    </>
  );
}
