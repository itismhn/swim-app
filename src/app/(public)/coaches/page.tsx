import { CalendarDays, Users } from "lucide-react";
import { db } from "@/server/db";
import { PageHero } from "../shared";
export const metadata = { title: "مربیان و گروه‌ها" };

export default async function Coaches() {
  const [coaches, groups] = await Promise.all([
    db.publicCoachProfile.findMany({ where: { published: true }, orderBy: { order: "asc" } }),
    db.publicGroupInfo.findMany({ orderBy: { order: "asc" } }),
  ]);
  return (
    <>
      <PageHero eyebrow="تیم ما" title="مربیان و گروه‌های تمرینی">مربیان مجرب و گروه‌بندی بر اساس سن و سطح، برای پیشرفت پیوسته هر شناگر.</PageHero>
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-xl font-extrabold">مربیان</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {coaches.map((c) => (
            <article key={c.id} className="card card-hover p-6">
              <div aria-hidden className="mb-4 grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 text-2xl font-extrabold text-brand-700">{c.name.slice(0, 1)}</div>
              <h3 className="text-lg font-bold">{c.name}</h3>
              <p className="text-sm font-medium text-brand-600 dark:text-brand-400">{c.title}</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">{c.bio}</p>
            </article>
          ))}
        </div>
        <h2 className="mt-14 text-xl font-extrabold">گروه‌های تمرینی</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {groups.map((g) => (
            <article key={g.id} className="card flex flex-col p-6">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold">{g.name}</h3>
                <span className="badge bg-brand-50 text-brand-700 ring-brand-200"><Users aria-hidden className="size-3" />{g.ageRange}</span>
              </div>
              <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">{g.description}</p>
              <p className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500"><CalendarDays aria-hidden className="size-4" />{g.schedule}</p>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}
