import Link from "next/link";
import { requireViewer } from "@/server/auth";
import { db } from "@/server/db";
import { athleteWhere, groupWhere } from "@/server/authz";
import { isStaff } from "@/server/viewer";
import { Empty, PageHeader } from "@/components/ui";
import { attendanceSummary } from "@/lib/domain/attendance";
import { ATTENDANCE_LABEL } from "@/lib/domain/labels";
import { faDate, faNum, startOfTehranDay } from "@/lib/domain/jalali";

export const metadata = { title: "گزارش حضور" };

export default async function Reports({ searchParams }: { searchParams: Promise<{ period?: string; group?: string }> }) {
  const v = await requireViewer();
  const sp = await searchParams;
  const period = sp.period === "month" ? "month" : "week";
  const days = period === "month" ? 30 : 7;
  const to = new Date();
  const from = new Date(startOfTehranDay(to).getTime() - (days - 1) * 86400000);
  const staff = isStaff(v);

  const [athletes, groups, settings] = await Promise.all([
    db.athlete.findMany({
      where: { AND: [athleteWhere(v), sp.group ? { groupId: sp.group } : {}, { status: { not: "LEFT" } }] },
      include: { user: { select: { name: true } }, group: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    staff ? db.group.findMany({ where: groupWhere(v), select: { id: true, name: true } }) : [],
    db.academySetting.findUnique({ where: { id: 1 } }),
  ]);
  const groupIds = [...new Set(athletes.map((a) => a.groupId).filter(Boolean))] as string[];
  const sessions = await db.trainingSession.findMany({
    where: { groupId: { in: groupIds }, startsAt: { gte: from, lte: to } },
    include: { attendance: { where: { athleteId: { in: athletes.map((a) => a.id) } }, select: { athleteId: true, status: true } } },
  });

  const rows = athletes.map((a) => {
    const own = sessions.filter((s) => s.groupId === a.groupId);
    const sum = attendanceSummary(
      own.map((s) => ({ sessionStatus: s.status, status: s.attendance.find((x) => x.athleteId === a.id)?.status ?? null })),
      { countExcusedAsAbsent: settings?.countExcusedAsAbsent },
    );
    return { a, sum };
  });

  return (
    <>
      <PageHeader
        title={`گزارش حضور ${period === "month" ? "ماهانه" : "هفتگی"}`}
        subtitle={`${faDate(from)} تا ${faDate(to)} — جلسات لغوشده در محاسبه نرخ حضور لحاظ نمی‌شوند${settings?.countExcusedAsAbsent ? "" : "؛ غیبت موجه نیز از مخرج کسر حذف می‌شود"}.`}
      />
      <form className="card mb-4 flex flex-wrap gap-2">
        <select name="period" defaultValue={period} className="input w-auto" aria-label="دوره"><option value="week">۷ روز اخیر</option><option value="month">۳۰ روز اخیر</option></select>
        {staff && <select name="group" defaultValue={sp.group ?? ""} className="input w-auto" aria-label="گروه"><option value="">همه گروه‌ها</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>}
        <button className="btn-secondary">نمایش</button>
      </form>
      {rows.length === 0 ? <Empty title="ورزشکاری برای گزارش وجود ندارد" /> : (
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead>
              <tr><th>ورزشکار</th><th>گروه</th><th>نرخ حضور</th>{Object.values(ATTENDANCE_LABEL).map((l) => <th key={l}>{l}</th>)}<th>لغوشده</th></tr>
            </thead>
            <tbody>
              {rows.map(({ a, sum }) => (
                <tr key={a.id}>
                  <td><Link href={`/app/athletes/${a.id}`} className="link">{a.user.name}</Link></td>
                  <td className="text-slate-500">{a.group?.name ?? "—"}</td>
                  <td>
                    {sum.rate === null ? "—" : (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded bg-slate-100"><div className="h-full bg-brand-500" style={{ width: `${sum.rate * 100}%` }} /></div>
                        {faNum(Math.round(sum.rate * 100))}٪
                      </div>
                    )}
                  </td>
                  {(Object.keys(ATTENDANCE_LABEL) as (keyof typeof ATTENDANCE_LABEL)[]).map((k) => <td key={k}>{faNum(sum.counts[k])}</td>)}
                  <td className="text-slate-400">{faNum(sum.cancelledExcluded)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
