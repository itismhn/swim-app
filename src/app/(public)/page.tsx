import Link from "next/link";
import { db } from "@/server/db";
import { faNum } from "@/lib/domain/jalali";

export default async function Home() {
  const [programs, s] = await Promise.all([
    db.program.findMany({ orderBy: { order: "asc" }, take: 4 }),
    db.academySetting.findUnique({ where: { id: 1 } }),
  ]);
  return (
    <>
      <section className="bg-gradient-to-b from-brand-700 to-brand-500 text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <p className="text-brand-100">شنای نوجوانان و رقابتی</p>
          <h1 className="mt-2 max-w-2xl text-3xl font-bold leading-relaxed md:text-5xl md:leading-snug">
            تمرین هدفمند، پیشرفت قابل اندازه‌گیری
          </h1>
          <p className="mt-4 max-w-xl text-brand-50">
            برنامه‌های تخصصی هر چهار شنا، آمادگی جسمانی خشکی، آموزش تغذیه و پایش عملکرد در طول فصل — با ارتباط شفاف بین مربی، ورزشکار و خانواده.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="btn bg-white text-brand-700 hover:bg-brand-50">درخواست ثبت‌نام یا مشاوره</Link>
            <Link href="/programs" className="btn border border-white/40 text-white hover:bg-white/10">مشاهده برنامه‌ها</Link>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-12 sm:grid-cols-3">
        {[
          ["استخر", `${faNum(s?.poolLengthMeters ?? 25)} متری`],
          ["جلسات هفتگی", `${faNum(s?.sessionsPerWeek ?? 3)} جلسه`],
          ["مدت هر جلسه", `${faNum(s?.sessionMinutes ?? 120)} دقیقه`],
        ].map(([k, v]) => (
          <div key={k} className="card text-center"><p className="text-sm text-slate-500">{k}</p><p className="mt-1 text-2xl font-bold text-brand-700">{v}</p></div>
        ))}
      </section>
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="mb-4 text-xl font-bold">خدمات ما</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {programs.map((p) => (
            <div key={p.id} className="card"><h3 className="font-bold text-brand-700">{p.title}</h3><p className="mt-2 text-sm leading-7 text-slate-600">{p.description}</p></div>
          ))}
        </div>
      </section>
    </>
  );
}
