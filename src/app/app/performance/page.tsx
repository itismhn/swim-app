import { requireViewer } from "@/server/auth";
import { db } from "@/server/db";
import { athleteWhere, resultWhere } from "@/server/authz";
import { isStaff } from "@/server/viewer";
import { eventLabel, performanceView } from "@/server/performance";
import { ActionForm } from "@/components/ActionForm";
import { ResultTypeBadge } from "@/components/badges";
import { PerformanceChart } from "@/components/PerformanceChart";
import { Empty, Field, PageHeader, Section } from "@/components/ui";
import { COURSE_LABEL, STROKE_LABEL } from "@/lib/domain/labels";
import { dateOnlyToJalaliString, faNum, toJalaliString } from "@/lib/domain/jalali";
import { eventKey, formatTime, personalBests } from "@/lib/domain/performance";
import { addResult, deleteResult, setTarget } from "./actions";

export const metadata = { title: "رکوردها و عملکرد" };

const DISTANCES = [25, 50, 100, 200, 400, 800, 1500];
const EVENT_STROKES = ["FREESTYLE", "BACKSTROKE", "BREASTSTROKE", "BUTTERFLY", "IM"] as const;

function EventFields() {
  return (
    <>
      <Field label="شنا" name="stroke" as="select">{EVENT_STROKES.map((s) => <option key={s} value={s}>{STROKE_LABEL[s]}</option>)}</Field>
      <Field label="مسافت (متر)" name="distance" as="select" defaultValue="100">{DISTANCES.map((d) => <option key={d} value={d}>{faNum(d)}</option>)}</Field>
      <Field label="نوع استخر" name="course" as="select">{Object.entries(COURSE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Field>
    </>
  );
}

export default async function PerformancePage({ searchParams }: { searchParams: Promise<{ athlete?: string }> }) {
  const v = await requireViewer();
  const staff = isStaff(v);
  const sp = await searchParams;
  const athletes = await db.athlete.findMany({ where: athleteWhere(v), select: { id: true, user: { select: { name: true } } }, orderBy: { user: { name: "asc" } } });
  if (!athletes.length) return <><PageHeader title="رکوردها و عملکرد" /><Empty title="ورزشکاری در دسترس شما نیست" /></>;

  // A requested athlete outside the viewer's scope silently falls back to the first allowed one.
  const selected = athletes.find((a) => a.id === sp.athlete) ?? athletes[0];
  const season = await db.season.findFirst({ where: { active: true } });
  const [results, targets] = await Promise.all([
    db.performanceResult.findMany({ where: { AND: [resultWhere(v), { athleteId: selected.id }] }, include: { recordedBy: { select: { name: true } } }, orderBy: { date: "desc" } }),
    season ? db.seasonTarget.findMany({ where: { athleteId: selected.id, seasonId: season.id } }) : [],
  ]);
  const perf = performanceView(results, targets);
  const pbIds = new Set([...personalBests(results).values()].map((r) => r.id));

  return (
    <>
      <PageHeader title="رکوردها و عملکرد" subtitle="رکورد شخصی فقط بین نتایج با شنا، مسافت و طول استخر یکسان محاسبه می‌شود." />
      {athletes.length > 1 && (
        <form className="card mb-4 flex gap-2">
          <select name="athlete" defaultValue={selected.id} className="input" aria-label="ورزشکار">{athletes.map((a) => <option key={a.id} value={a.id}>{a.user.name}</option>)}</select>
          <button className="btn-secondary">نمایش</button>
        </form>
      )}
      <div className="grid gap-4">
        <Section title={`نمودار فصل — ${selected.user.name}`}>
          <PerformanceChart results={perf.chart} refs={perf.refs} />
        </Section>

        {staff && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="ثبت زمان جدید">
              <ActionForm action={addResult} className="grid gap-3 sm:grid-cols-2" resetOnSuccess submitLabel="ثبت زمان">
                <Field label="ورزشکار" name="athleteId" as="select" defaultValue={selected.id}>{athletes.map((a) => <option key={a.id} value={a.id}>{a.user.name}</option>)}</Field>
                <EventFields />
                <Field label="زمان" name="time" placeholder="1:02.35" dir="ltr" required hint="دقیقه:ثانیه.صدم" />
                <Field label="تاریخ" name="date" defaultValue={toJalaliString(new Date())} dir="ltr" />
                <Field label="نوع نتیجه" name="type" as="select"><option value="PRACTICE_TEST">تست تمرینی</option><option value="OFFICIAL">مسابقه رسمی</option></Field>
                <Field label="محل" name="venue" />
                <Field label="زمان‌های میانی (اختیاری)" name="splits" placeholder="29.80, 32.55" dir="ltr" />
                <Field label="یادداشت مربی" name="notes" />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isBaseline" /> رکورد مبنا (شروع فصل)</label>
              </ActionForm>
            </Section>
            <Section title="هدف فصل">
              {!season ? <p className="text-sm text-slate-500">فصل فعالی وجود ندارد.</p> : (
                <ActionForm action={setTarget} className="grid gap-3 sm:grid-cols-2" submitLabel="ذخیره هدف">
                  <Field label="ورزشکار" name="athleteId" as="select" defaultValue={selected.id}>{athletes.map((a) => <option key={a.id} value={a.id}>{a.user.name}</option>)}</Field>
                  <EventFields />
                  <Field label="زمان هدف" name="time" placeholder="1:00.00" dir="ltr" />
                </ActionForm>
              )}
              {targets.length > 0 && (
                <ul className="mt-3 text-sm">{targets.map((t) => <li key={t.id}>{eventLabel(t)}: <b dir="ltr">{formatTime(t.timeMs)}</b></li>)}</ul>
              )}
            </Section>
          </div>
        )}

        <Section title="همه نتایج">
          {results.length === 0 ? <Empty title="نتیجه‌ای ثبت نشده است" /> : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>تاریخ</th><th>ماده</th><th>زمان</th><th>نوع</th><th>میانی</th><th>محل</th><th>ثبت‌کننده</th>{staff && <th />}</tr></thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.id} className={r.type === "OFFICIAL" ? "bg-brand-50/40" : ""}>
                      <td>{dateOnlyToJalaliString(r.date)}</td>
                      <td>{eventLabel(r)}{r.isBaseline && <span className="ms-1 text-xs text-slate-500">(مبنا)</span>}</td>
                      <td dir="ltr" className="text-end font-bold">{formatTime(r.timeMs)} {pbIds.has(r.id) && <span title="رکورد شخصی" className="text-amber-600">PB</span>}</td>
                      <td><ResultTypeBadge s={r.type} /></td>
                      <td dir="ltr" className="text-end text-xs text-slate-500">{r.splitsMs.map(formatTime).join(" / ") || "—"}</td>
                      <td className="text-xs">{r.venue ?? "—"}</td>
                      <td className="text-xs">{r.recordedBy.name}</td>
                      {staff && <td><form action={async () => { "use server"; await deleteResult(r.id); }}><button className="text-xs text-rose-600">حذف</button></form></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-slate-500">ردیف‌های رنگی: مسابقه رسمی. «PB» = بهترین زمان در همان شنا، مسافت و نوع استخر. {Object.keys(Object.fromEntries(results.map((r) => [eventKey(r), 1]))).length > 1 && "نتایج استخر ۲۵ و ۵۰ متری با هم مقایسه نمی‌شوند."}</p>
            </div>
          )}
        </Section>
      </div>
    </>
  );
}
