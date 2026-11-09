import Link from "next/link";
import { db } from "@/server/db";
export const metadata = { title: "برنامه‌ها و خدمات" };

export default async function Programs() {
  const programs = await db.program.findMany({ orderBy: { order: "asc" } });
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-2xl font-bold">برنامه‌ها و خدمات</h1>
      <div className="mt-6 space-y-4">
        {programs.map((p, i) => (
          <article key={p.id} className="card flex gap-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-600 font-bold text-white">{(i + 1).toLocaleString("fa-IR")}</span>
            <div><h2 className="font-bold">{p.title}</h2><p className="mt-1 text-sm leading-7 text-slate-600">{p.description}</p></div>
          </article>
        ))}
      </div>
      <Link href="/register" className="btn-primary mt-8">درخواست ارزیابی اولیه</Link>
    </div>
  );
}
