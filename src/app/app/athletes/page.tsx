import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma, Stroke, MembershipStatus } from "@prisma/client";
import { requireViewer } from "@/server/auth";
import { db } from "@/server/db";
import { athleteWhere, groupWhere } from "@/server/authz";
import { Badge, Empty, PageHeader, SampleBadge } from "@/components/ui";
import { MEMBERSHIP_LABEL, STROKE_LABEL } from "@/lib/domain/labels";
import { ageOn, faNum } from "@/lib/domain/jalali";

export const metadata = { title: "ورزشکاران" };

export default async function AthletesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const v = await requireViewer();
  if (v.role === "ATHLETE") {
    const me = await db.athlete.findUnique({ where: { userId: v.id }, select: { id: true } });
    redirect(me ? `/app/athletes/${me.id}` : "/app");
  }
  if (v.role === "GUARDIAN") redirect("/app/family");
  if (v.role === "NUTRITIONIST") redirect("/app/nutrition");

  const sp = await searchParams;
  const q = sp.q?.trim();
  const where: Prisma.AthleteWhereInput = {
    AND: [
      athleteWhere(v),
      q ? { user: { name: { contains: q, mode: "insensitive" } } } : {},
      sp.group ? { groupId: sp.group } : {},
      sp.status ? { status: sp.status as MembershipStatus } : {},
      sp.stroke ? { specialtyStrokes: { has: sp.stroke as Stroke } } : {},
    ],
  };
  const [athletes, groups] = await Promise.all([
    db.athlete.findMany({ where, include: { user: { select: { name: true, isSample: true } }, group: { select: { name: true } } }, orderBy: { user: { name: "asc" } } }),
    db.group.findMany({ where: groupWhere(v), select: { id: true, name: true } }),
  ]);

  return (
    <>
      <PageHeader title="ورزشکاران" subtitle={`${faNum(athletes.length)} نفر در دسترس شما`} actions={<Link href="/app/athletes/new" className="btn-primary">+ ورزشکار جدید</Link>} />
      <form className="card mb-4 grid gap-3 sm:grid-cols-5" role="search">
        <input name="q" defaultValue={q} placeholder="جستجوی نام…" className="input sm:col-span-2" aria-label="جستجو" />
        <select name="group" defaultValue={sp.group ?? ""} className="input" aria-label="گروه">
          <option value="">همه گروه‌ها</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select name="stroke" defaultValue={sp.stroke ?? ""} className="input" aria-label="شنای تخصصی">
          <option value="">همه شناها</option>{(["FREESTYLE", "BACKSTROKE", "BREASTSTROKE", "BUTTERFLY", "IM"] as const).map((s) => <option key={s} value={s}>{STROKE_LABEL[s]}</option>)}
        </select>
        <div className="flex gap-2">
          <select name="status" defaultValue={sp.status ?? ""} className="input" aria-label="وضعیت">
            <option value="">همه وضعیت‌ها</option>{Object.entries(MEMBERSHIP_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <button className="btn-secondary">فیلتر</button>
        </div>
      </form>
      {athletes.length === 0 ? (
        <Empty title="ورزشکاری یافت نشد" hint="فیلترها را تغییر دهید یا ورزشکار جدید ثبت کنید." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {athletes.map((a) => (
            <li key={a.id}>
              <Link href={`/app/athletes/${a.id}`} className="card flex items-center justify-between gap-3 hover:border-brand-200">
                <div>
                  <p className="font-medium">{a.user.name} {a.user.isSample && <SampleBadge />}</p>
                  <p className="mt-1 text-xs text-slate-500">{a.group?.name ?? "بدون گروه"} · {faNum(ageOn(a.birthDate))} ساله</p>
                  <div className="mt-2 flex flex-wrap gap-1">{a.specialtyStrokes.map((s) => <Badge key={s} tone="blue">{STROKE_LABEL[s]}</Badge>)}</div>
                </div>
                <Badge tone={a.status === "ACTIVE" ? "green" : "gray"}>{MEMBERSHIP_LABEL[a.status]}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
