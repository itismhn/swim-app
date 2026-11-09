import { Lock, Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer, requireViewer } from "@/server/auth";
import { db } from "@/server/db";
import { canEditAthlete, canEditMedical, canViewMedical, coachNoteWhere, getAthleteForViewer, groupWhere, athleteWhere } from "@/server/authz";
import { isAcademyWide, isStaff } from "@/server/viewer";
import { performanceView, eventLabel } from "@/server/performance";
import { ActionForm } from "@/components/ActionForm";
import { AttendanceBadge, ResultTypeBadge } from "@/components/badges";
import { PerformanceChart } from "@/components/PerformanceChart";
import { Badge, Empty, Field, PageHeader, SampleBadge, Section, Stat } from "@/components/ui";
import { attendanceSummary } from "@/lib/domain/attendance";
import { ageOn, dateOnlyToJalaliString, faDateTime, faNum } from "@/lib/domain/jalali";
import { LINK_STATUS_LABEL, MEMBERSHIP_LABEL, STROKE_LABEL } from "@/lib/domain/labels";
import { formatDelta, formatTime } from "@/lib/domain/performance";
import { AthleteFields } from "../AthleteFields";
import { addCoachNote, saveMedical, updateAthlete } from "../actions";

/** Title is loaded through the same scoped query, so it never reveals a record the viewer can't see. */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const v = await getViewer();
  if (!v) return {};
  const { id } = await params;
  const x = await db.athlete.findFirst({ where: { AND: [{ id }, athleteWhere(v)] }, select: { user: { select: { name: true } } } });
  return { title: x?.user.name ?? "یافت نشد" };
}

export default async function AthleteProfile({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ edit?: string }> }) {
  const v = await requireViewer();
  const { id } = await params;
  const { edit } = await searchParams;
  const a = await getAthleteForViewer(v, id);
  if (!a) notFound(); // same response for "missing" and "not yours"

  const [canEdit, canMed, canEditMed] = await Promise.all([canEditAthlete(v, id), canViewMedical(v, id), canEditMedical(v, id)]);
  const since = new Date(Date.now() - 30 * 86400000);
  const season = await db.season.findFirst({ where: { active: true } });
  const [notes, medical, sessions, results, targets, completions, groups, settings] = await Promise.all([
    db.coachNote.findMany({ where: { AND: [{ athleteId: id }, coachNoteWhere(v)] }, include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 20 }),
    canMed ? db.athleteMedical.findUnique({ where: { athleteId: id } }) : null,
    a.groupId
      ? db.trainingSession.findMany({
          where: { groupId: a.groupId, startsAt: { gte: since, lte: new Date() } },
          include: { attendance: { where: { athleteId: id } } },
          orderBy: { startsAt: "desc" },
        })
      : [],
    db.performanceResult.findMany({ where: { athleteId: id }, orderBy: { date: "desc" } }),
    season ? db.seasonTarget.findMany({ where: { athleteId: id, seasonId: season.id } }) : [],
    db.workoutCompletion.findMany({ where: { athleteId: id }, include: { plan: { select: { title: true, date: true, plannedMeters: true } } }, orderBy: { createdAt: "desc" }, take: 5 }),
    canEdit ? db.group.findMany({ where: groupWhere(v), select: { id: true, name: true } }) : [],
    db.academySetting.findUnique({ where: { id: 1 } }),
  ]);

  const att = attendanceSummary(
    sessions.map((s) => ({ sessionStatus: s.status, status: s.attendance[0]?.status ?? null })),
    { countExcusedAsAbsent: settings?.countExcusedAsAbsent },
  );
  const perf = performanceView(results, targets);
  const age = ageOn(a.birthDate);

  return (
    <>
      <PageHeader
        title={a.user.name}
        subtitle={<>{a.group?.name ?? "بدون گروه"} · {faNum(age)} ساله · {MEMBERSHIP_LABEL[a.status]} {a.user.isSample && <SampleBadge />}</>}
        actions={canEdit && <Link href={edit ? `/app/athletes/${id}` : `/app/athletes/${id}?edit=1`} className="btn-secondary">{edit ? "بستن ویرایش" : "ویرایش پروفایل"}</Link>}
      />

      {canEdit && edit && (
        <ActionForm action={updateAthlete.bind(null, id)} className="card mb-4" submitLabel="ذخیره تغییرات">
          <AthleteFields a={a} groups={groups} allowNoGroup={isAcademyWide(v)} />
        </ActionForm>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Stat label="نرخ حضور ۳۰ روز اخیر" value={att.rate === null ? "—" : `${faNum(Math.round(att.rate * 100))}٪`} hint={`${faNum(att.attended)} از ${faNum(att.eligible)} جلسه · ${faNum(att.cancelledExcluded)} جلسه لغوشده محاسبه نشد`} />
        <Stat label="رکوردهای شخصی" value={faNum(perf.pbs.size)} hint="فقط بین نتایج قابل مقایسه (شنا، مسافت و طول استخر یکسان)" />
        <Stat label="عضویت از" value={dateOnlyToJalaliString(a.enrolledAt)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="مشخصات و اهداف">
          <dl className="grid grid-cols-[7rem_1fr] gap-y-2 text-sm">
            <dt className="text-slate-500">تاریخ تولد</dt><dd>{dateOnlyToJalaliString(a.birthDate)}</dd>
            <dt className="text-slate-500">شنای تخصصی</dt><dd className="flex flex-wrap gap-1">{a.specialtyStrokes.map((s) => <Badge key={s} tone="blue">{STROKE_LABEL[s]}</Badge>)}</dd>
            <dt className="text-slate-500">شنای دوم</dt><dd className="flex flex-wrap gap-1">{a.secondaryStrokes.length ? a.secondaryStrokes.map((s) => <Badge key={s}>{STROKE_LABEL[s]}</Badge>) : "—"}</dd>
            <dt className="text-slate-500">مربی</dt><dd>{a.group?.coaches.map((c) => c.user.name).join("، ") || "—"}</dd>
            <dt className="text-slate-500">اهداف تمرینی</dt><dd>{a.trainingGoals ?? "—"}</dd>
            <dt className="text-slate-500">اهداف فصل</dt><dd>{a.seasonGoals ?? "—"}</dd>
            <dt className="text-slate-500">تماس اضطراری</dt><dd>{a.emergencyName ?? "—"} <span dir="ltr">{a.emergencyPhone}</span></dd>
          </dl>
        </Section>

        <Section title="سرپرستان">
          {a.guardianLinks.length === 0 ? <p className="text-sm text-slate-500">سرپرستی ثبت نشده است.</p> : (
            <ul className="space-y-2 text-sm">
              {a.guardianLinks.filter((g) => isStaff(v) || g.status === "VERIFIED").map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-2">
                  <span>{g.guardian.name} ({g.relation}) {isStaff(v) && <span dir="ltr" className="text-slate-500">{g.guardian.phone}</span>}</span>
                  <Badge tone={g.status === "VERIFIED" ? "green" : g.status === "PENDING" ? "amber" : "red"}>{LINK_STATUS_LABEL[g.status]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <div className="lg:col-span-2">
          <Section title="نمودار عملکرد فصل" actions={canEdit && <Link href={`/app/performance?athlete=${id}`} className="btn-secondary btn-sm"><Plus aria-hidden />ثبت زمان</Link>}>
            <PerformanceChart results={perf.chart} refs={perf.refs} />
            {perf.pbs.size > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="table">
                  <thead><tr><th>ماده</th><th>رکورد شخصی</th><th>تاریخ</th><th>نوع</th><th>نسبت به مبنا</th><th>تا هدف فصل</th></tr></thead>
                  <tbody>
                    {[...perf.pbs.entries()].map(([k, r]) => {
                      const ref = perf.refs.find((x) => x.event === k);
                      return (
                        <tr key={k}>
                          <td>{eventLabel(r)}</td>
                          <td className="font-bold" dir="ltr">{formatTime(r.timeMs)}</td>
                          <td>{dateOnlyToJalaliString(r.date)}</td>
                          <td><ResultTypeBadge s={r.type} /></td>
                          <td dir="ltr">{formatDelta(ref?.baselineMs ? r.timeMs - ref.baselineMs : null)}</td>
                          <td dir="ltr">{formatDelta(ref?.targetMs ? r.timeMs - ref.targetMs : null)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="mt-2 text-xs text-slate-500">مقدار منفی یعنی سریع‌تر از مرجع.</p>
              </div>
            )}
          </Section>
        </div>

        <Section title="حضور و غیاب اخیر">
          {sessions.length === 0 ? <p className="text-sm text-slate-500">جلسه‌ای در ۳۰ روز اخیر نبوده است.</p> : (
            <ul className="divide-y divide-slate-100 text-sm">
              {sessions.slice(0, 10).map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2">
                  <span>{faDateTime(s.startsAt)}</span>
                  {s.status === "CANCELLED" ? <Badge tone="gray">لغو شد</Badge> : s.attendance[0] ? <AttendanceBadge s={s.attendance[0].status} /> : <Badge>ثبت نشده</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="بازخورد تمرین‌ها">
          {completions.length === 0 ? <p className="text-sm text-slate-500">هنوز گزارشی ثبت نشده است.</p> : (
            <ul className="space-y-2 text-sm">
              {completions.map((c) => (
                <li key={c.id} className="rounded-xl bg-slate-50 p-3">
                  <p className="font-medium">{c.plan.title}</p>
                  <p className="text-xs text-slate-500">انجام‌شده {faNum(c.actualMeters)} از {faNum(c.plan.plannedMeters)} متر برنامه‌ریزی‌شده · سختی {c.rpe ? faNum(c.rpe) : "—"}/۱۰</p>
                  {c.feedback && <p className="mt-1">{c.feedback}</p>}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title={isStaff(v) ? "یادداشت‌های مربی" : "یادداشت‌های مربی برای شما"}>
          {notes.length === 0 ? <p className="text-sm text-slate-500">یادداشتی نیست.</p> : (
            <ul className="space-y-2 text-sm">
              {notes.map((n) => (
                <li key={n.id} className="rounded-xl bg-slate-50 p-3">
                  <p>{n.body}</p>
                  <p className="mt-1 text-xs text-slate-500">{n.author.name} · {faDateTime(n.createdAt)} {isStaff(v) && <Badge tone={n.visibility === "SHARED" ? "blue" : "gray"}>{n.visibility === "SHARED" ? "قابل مشاهده برای ورزشکار و خانواده" : "فقط کادر فنی"}</Badge>}</p>
                </li>
              ))}
            </ul>
          )}
          {canEdit && (
            <ActionForm action={addCoachNote.bind(null, id)} className="mt-3 space-y-2" resetOnSuccess submitLabel="افزودن یادداشت" submitClassName="btn-secondary btn-sm">
              <Field label="یادداشت جدید" name="body" as="textarea" rows={2} />
              <Field label="قابل مشاهده برای" name="visibility" as="select" defaultValue="STAFF_ONLY">
                <option value="STAFF_ONLY">فقط کادر فنی</option>
                <option value="SHARED">ورزشکار و سرپرستان تأییدشده</option>
              </Field>
            </ActionForm>
          )}
        </Section>

        {canMed && (
          <Section icon={Lock} title="محدودیت‌های تمرینی / پزشکی (محرمانه)">
            <p className="mb-2 text-xs text-slate-500">دسترسی محدود. فقط اطلاعات لازم برای ایمنی تمرین ثبت شود. این سامانه تشخیص یا درمان پزشکی ارائه نمی‌دهد.</p>
            {medical ? (
              <dl className="grid grid-cols-[7rem_1fr] gap-y-2 text-sm">
                <dt className="text-slate-500">محدودیت تمرینی</dt><dd>{medical.trainingRestrictions ?? "—"}</dd>
                <dt className="text-slate-500">حساسیت غذایی</dt><dd>{medical.allergies ?? "—"}</dd>
                <dt className="text-slate-500">رضایت سرپرست</dt><dd>{faDateTime(medical.guardianConsentAt)}</dd>
              </dl>
            ) : <Empty title="اطلاعاتی ثبت نشده" hint={age < 18 ? "ثبت این اطلاعات فقط توسط سرپرست تأییدشده و با رضایت او ممکن است." : undefined} />}
            {canEditMed && (v.role === "GUARDIAN" || medical) && (
              <details className="mt-3">
                <summary className="btn-secondary btn-sm cursor-pointer">ثبت / ویرایش</summary>
                <ActionForm action={saveMedical.bind(null, id)} className="mt-3 space-y-3" submitLabel="ذخیره">
                  <Field label="محدودیت تمرینی" name="trainingRestrictions" as="textarea" defaultValue={medical?.trainingRestrictions} />
                  <Field label="حساسیت غذایی (در صورت وجود)" name="allergies" defaultValue={medical?.allergies} />
                  <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="consent" className="mt-1" />
                    <span>{v.role === "GUARDIAN" ? "به‌عنوان سرپرست، با ثبت این اطلاعات و دسترسی محدود کادر فنی موافقم." : "تأیید می‌کنم این تغییر با هماهنگی سرپرست انجام شده است."}</span></label>
                  <p data-error-for="consent" hidden className="text-xs text-rose-600" />
                </ActionForm>
              </details>
            )}
          </Section>
        )}
      </div>
    </>
  );
}
