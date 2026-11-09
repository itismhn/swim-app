import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/server/db";
import { faNum } from "@/lib/domain/jalali";
import { PageHero } from "../shared";
export const metadata = { title: "برنامه‌ها و خدمات" };

export default async function Programs() {
  const programs = await db.program.findMany({ orderBy: { order: "asc" } });
  return (
    <>
      <PageHero eyebrow="خدمات" title="برنامه‌ها و خدمات">از آموزش فنی تا آمادگی جسمانی و تغذیه؛ هر برنامه با هدف فصلی ورزشکار هماهنگ است.</PageHero>
      <div className="mx-auto max-w-4xl px-4 py-12">
        <ol className="relative space-y-4 before:absolute before:inset-y-6 before:start-[1.45rem] before:w-px before:bg-brand-100">
          {programs.map((p, i) => (
            <li key={p.id} className="relative flex gap-5">
              <span className="nums z-10 grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-pool-700 text-lg font-extrabold text-white shadow-md shadow-brand-950/15 ring-4 ring-canvas">{faNum(i + 1)}</span>
              <article className="card flex-1 p-6"><h2 className="text-lg font-bold">{p.title}</h2><p className="mt-2 text-sm leading-7 text-slate-600">{p.description}</p></article>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex justify-center"><Link href="/register" className="btn-primary h-12 px-6">درخواست ارزیابی اولیه <ArrowLeft aria-hidden /></Link></div>
      </div>
    </>
  );
}
