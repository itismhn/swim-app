import { db } from "@/server/db";
export const metadata = { title: "مربیان و گروه‌ها" };

export default async function Coaches() {
  const [coaches, groups] = await Promise.all([
    db.publicCoachProfile.findMany({ where: { published: true }, orderBy: { order: "asc" } }),
    db.publicGroupInfo.findMany({ orderBy: { order: "asc" } }),
  ]);
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-2xl font-bold">مربیان</h1>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {coaches.map((c) => (
          <article key={c.id} className="card">
            <div aria-hidden className="mb-3 grid size-14 place-items-center rounded-full bg-brand-100 text-xl text-brand-700">{c.name.slice(0, 1)}</div>
            <h2 className="font-bold">{c.name}</h2>
            <p className="text-sm text-brand-600">{c.title}</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">{c.bio}</p>
          </article>
        ))}
      </div>
      <h2 className="mt-12 text-2xl font-bold">گروه‌های تمرینی</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {groups.map((g) => (
          <article key={g.id} className="card">
            <h3 className="font-bold">{g.name}</h3>
            <p className="text-sm text-brand-600">{g.ageRange}</p>
            <p className="mt-2 text-sm text-slate-600">{g.description}</p>
            <p className="mt-2 text-xs text-slate-500">زمان‌بندی: {g.schedule}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
