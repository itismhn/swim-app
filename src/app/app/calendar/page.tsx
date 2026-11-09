import Link from "next/link";
import { requireViewer } from "@/server/auth";
import { db } from "@/server/db";
import { groupWhere, sessionWhere } from "@/server/authz";
import { isStaff } from "@/server/viewer";
import { ActionForm } from "@/components/ActionForm";
import { SessionBadge } from "@/components/badges";
import { Empty, Field, PageHeader } from "@/components/ui";
import { faDate, faNum, faTime, startOfTehranDay, tehranParts, toJalaliString } from "@/lib/domain/jalali";
import { jsDayToIran, WEEKDAY_LABEL } from "@/lib/domain/labels";
import { createSession, rescheduleSession, setSessionStatus } from "./actions";

export const metadata = { title: "جلسات" };

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const v = await requireViewer();
  const w = Number((await searchParams).w ?? 0) || 0;
  const today = startOfTehranDay(new Date());
  const dow = jsDayToIran(tehranParts(new Date()).weekday);
  const weekStart = new Date(today.getTime() - dow * 86400000 + w * 7 * 86400000);
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
  const staff = isStaff(v);

  const [sessions, groups, settings] = await Promise.all([
    db.trainingSession.findMany({
      where: { AND: [sessionWhere(v), { startsAt: { gte: weekStart, lt: weekEnd } }] },
      include: { group: { select: { name: true } }, _count: { select: { attendance: true } } },
      orderBy: { startsAt: "asc" },
    }),
    staff ? db.group.findMany({ where: groupWhere(v), select: { id: true, name: true } }) : [],
    db.academySetting.findUnique({ where: { id: 1 } }),
  ]);
  const days = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * 86400000));

  return (
    <>
      <PageHeader
        title="جلسات تمرین"
        subtitle={`هفته ${faDate(weekStart)} تا ${faDate(new Date(weekEnd.getTime() - 1))}`}
        actions={<>
          <Link href={`/app/calendar?w=${w - 1}`} className="btn-secondary btn-sm">→ هفته قبل</Link>
          {w !== 0 && <Link href="/app/calendar" className="btn-secondary btn-sm">امروز</Link>}
          <Link href={`/app/calendar?w=${w + 1}`} className="btn-secondary btn-sm">هفته بعد ←</Link>
        </>}
      />
      <div className="space-y-3">
        {days.map((d, i) => {
          const items = sessions.filter((s) => s.startsAt >= d && s.startsAt < new Date(d.getTime() + 86400000));
          const isToday = d.getTime() === today.getTime();
          return (
            <section key={i} className={`card ${isToday ? "border-brand-500 ring-2 ring-brand-100" : ""}`}>
              <h2 className="mb-2 text-sm font-bold">{WEEKDAY_LABEL[i]} {faDate(d)} {isToday && <span className="text-brand-600 dark:text-brand-400">(امروز)</span>}</h2>
              {items.length === 0 ? <p className="text-xs text-slate-400">جلسه‌ای نیست</p> : (
                <ul className="space-y-2">
                  {items.map((s) => (
                    <li key={s.id} className={`rounded-xl border p-3 ${s.status === "CANCELLED" ? "border-rose-100 bg-rose-50/50" : "border-slate-100"}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className={`font-medium ${s.status === "CANCELLED" ? "line-through" : ""}`}>{faTime(s.startsAt)} · {s.group.name}</p>
                          <p className="text-xs text-slate-500">{faNum(s.minutes)} دقیقه · {s.location}{s.note ? ` · ${s.note}` : ""}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <SessionBadge s={s.status} />
                          {staff && s.status !== "CANCELLED" && (
                            <Link href={`/app/attendance/${s.id}`} className="btn-primary btn-sm">حضور و غیاب {s._count.attendance ? `(${faNum(s._count.attendance)})` : ""}</Link>
                          )}
                        </div>
                      </div>
                      {staff && (
                        <details className="mt-2 text-sm">
                          <summary className="flex min-h-10 cursor-pointer items-center text-xs text-slate-500">مدیریت جلسه</summary>
                          <div className="mt-2 grid gap-3 md:grid-cols-2">
                            <ActionForm action={setSessionStatus.bind(null, s.id)} className="space-y-2" submitLabel="ثبت وضعیت" submitClassName="btn-secondary btn-sm">
                              <Field label="وضعیت" name="status" as="select" defaultValue={s.status}>
                                <option value="SCHEDULED">برنامه‌ریزی‌شده</option><option value="COMPLETED">برگزار شد</option><option value="CANCELLED">لغو (از محاسبه حضور حذف می‌شود)</option>
                              </Field>
                              <Field label="توضیح" name="note" defaultValue={s.note} />
                            </ActionForm>
                            <ActionForm action={rescheduleSession.bind(null, s.id)} className="space-y-2" submitLabel="تغییر زمان" submitClassName="btn-secondary btn-sm">
                              <Field label="تاریخ جدید" name="date" defaultValue={toJalaliString(s.startsAt)} dir="ltr" />
                              <Field label="ساعت جدید" name="time" defaultValue={`${String(tehranParts(s.startsAt).hh).padStart(2, "0")}:${String(tehranParts(s.startsAt).mm).padStart(2, "0")}`} dir="ltr" />
                            </ActionForm>
                          </div>
                        </details>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      {sessions.length === 0 && <div className="mt-3"><Empty title="در این هفته جلسه‌ای ثبت نشده است" hint={staff ? "از صفحه گروه، جلسات را از روی زمان‌بندی هفتگی بسازید." : undefined} /></div>}
      {staff && groups.length > 0 && (
        <ActionForm action={createSession} className="card mt-6 grid gap-3 md:grid-cols-3" resetOnSuccess submitLabel="افزودن جلسه">
          <h2 className="font-bold md:col-span-3">افزودن جلسه موردی</h2>
          <Field label="گروه" name="groupId" as="select">{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</Field>
          <Field label="تاریخ (شمسی)" name="date" defaultValue={toJalaliString(new Date())} dir="ltr" />
          <Field label="ساعت" name="time" placeholder="16:00" dir="ltr" />
          <Field label="مدت (دقیقه)" name="minutes" defaultValue={settings?.sessionMinutes ?? 120} inputMode="numeric" />
          <Field label="محل" name="location" />
          <Field label="توضیح" name="note" />
        </ActionForm>
      )}
    </>
  );
}
