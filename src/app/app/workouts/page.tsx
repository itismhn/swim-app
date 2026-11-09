import { Plus } from "lucide-react";
import Link from "next/link";
import type { PlanStatus } from "@prisma/client";
import { requireViewer } from "@/server/auth";
import { db } from "@/server/db";
import { workoutPlanWhere } from "@/server/authz";
import { isStaff } from "@/server/viewer";
import { PlanBadge } from "@/components/badges";
import { Empty, PageHeader } from "@/components/ui";
import { dateOnlyToJalaliString, faNum } from "@/lib/domain/jalali";

export const metadata = { title: "برنامه‌های تمرین در آب" };

export default async function Workouts({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const v = await requireViewer();
  const staff = isStaff(v);
  const { status } = await searchParams;
  const plans = await db.workoutPlan.findMany({
    where: { AND: [workoutPlanWhere(v), status ? { status: status as PlanStatus } : {}] },
    include: { group: { select: { name: true } }, athlete: { select: { user: { select: { name: true } } } }, _count: { select: { completions: true } } },
    orderBy: { date: "desc" },
    take: 60,
  });
  return (
    <>
      <PageHeader title="برنامه‌های تمرین در آب" actions={staff && <Link href="/app/workouts/new" className="btn-primary"><Plus aria-hidden />برنامه جدید</Link>} />
      {staff && (
        <nav className="mb-4 flex gap-2 text-sm">
          {[["", "همه"], ["DRAFT", "پیش‌نویس"], ["PUBLISHED", "منتشرشده"]].map(([k, l]) => (
            <Link key={k} href={k ? `?status=${k}` : "?"} className={`btn-sm btn ${status === k || (!status && !k) ? "bg-brand-600 text-white" : "border border-slate-300 bg-surface"}`}>{l}</Link>
          ))}
        </nav>
      )}
      {plans.length === 0 ? <Empty title="برنامه‌ای وجود ندارد" hint={staff ? undefined : "وقتی مربی برنامه‌ای منتشر کند، اینجا نمایش داده می‌شود."} /> : (
        <ul className="grid gap-3 md:grid-cols-2">
          {plans.map((p) => (
            <li key={p.id}>
              <Link href={`/app/workouts/${p.id}`} className="card block hover:border-brand-200">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{p.title}</p>
                  <PlanBadge s={p.status} />
                </div>
                <p className="mt-1 text-xs text-slate-500">{dateOnlyToJalaliString(p.date)} · {p.group ? `گروه ${p.group.name}` : `فردی: ${p.athlete?.user.name}`} · نسخه {faNum(p.version)}</p>
                <p className="mt-2 text-sm">حجم برنامه: <b>{faNum(p.plannedMeters)} متر</b> {staff && <span className="text-xs text-slate-500">· {faNum(p._count.completions)} گزارش اجرا</span>}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
