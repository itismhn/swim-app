import Link from "next/link";
import { requireViewer } from "@/server/auth";
import { db } from "@/server/db";
import { athleteWhere, drylandPlanWhere, groupWhere, sessionWhere, threadWhere, workoutPlanWhere } from "@/server/authz";
import type { Viewer } from "@/server/viewer";
import { performanceView, eventLabel } from "@/server/performance";
import { AttendanceBadge, PlanBadge, ResultTypeBadge, SessionBadge } from "@/components/badges";
import { PerformanceChart } from "@/components/PerformanceChart";
import { Badge, Empty, PageHeader, Section, Stat } from "@/components/ui";
import { attendanceSummary, type AttendanceRow } from "@/lib/domain/attendance";
import { dateOnlyToJalaliString, faDateTime, faNum, faTime, startOfTehranDay } from "@/lib/domain/jalali";
import { eventKey, formatTime, personalBests } from "@/lib/domain/performance";
import { REQUEST_STATUS_LABEL } from "@/lib/domain/labels";

export const metadata = { title: "داشبورد" };

const DAY = 86400000;
const pct = (r: number | null) => (r === null ? "—" : `${faNum(Math.round(r * 100))}٪`);

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const v = await requireViewer();
  const { denied } = await searchParams;
  const body =
    v.role === "ADMIN" ? <AdminDash v={v} />
    : v.role === "HEAD_COACH" || v.role === "COACH" ? <CoachDash v={v} />
    : v.role === "NUTRITIONIST" ? <NutritionDash v={v} />
    : <FamilyDash v={v} />;
  return (
    <>
      {denied && <p className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">به صفحه درخواستی دسترسی ندارید.</p>}
      {body}
    </>
  );
}

async function unansweredThreads(v: Viewer) {
  const threads = await db.thread.findMany({
    where: threadWhere(v),
    include: { participants: { where: { userId: v.id } }, messages: { orderBy: { createdAt: "desc" }, take: 1, include: { author: { select: { name: true } } } } },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  return threads.filter((t) => t.messages[0] && t.messages[0].authorId !== v.id);
}

async function overallAttendance(groupIds: string[] | null, days: number) {
  const settings = await db.academySetting.findUnique({ where: { id: 1 } });
  const sessions = await db.trainingSession.findMany({
    where: { startsAt: { gte: new Date(Date.now() - days * DAY), lte: new Date() }, ...(groupIds ? { groupId: { in: groupIds } } : {}) },
    include: { attendance: { select: { status: true } } },
  });
  return attendanceSummary(
    sessions.flatMap((s): AttendanceRow[] => (s.status === "CANCELLED" ? [{ sessionStatus: s.status, status: null }] : s.attendance.map((a) => ({ sessionStatus: s.status, status: a.status })))),
    { countExcusedAsAbsent: settings?.countExcusedAsAbsent },
  );
}

// ───────────────── Admin ─────────────────
async function AdminDash({ v }: { v: Viewer }) {
  const now = new Date();
  const [athletes, groups, coaches, upcoming, inquiries, unassignedNutrition, pendingLinks, att] = await Promise.all([
    db.athlete.count({ where: { status: "ACTIVE" } }),
    db.group.findMany({ where: { active: true }, include: { coaches: { include: { user: { select: { name: true } } } }, _count: { select: { athletes: { where: { status: "ACTIVE" } } } } } }),
    db.user.count({ where: { role: { in: ["COACH", "HEAD_COACH"] }, active: true } }),
    db.trainingSession.findMany({ where: { startsAt: { gte: now, lte: new Date(+now + 7 * DAY) } }, include: { group: { select: { name: true } } }, orderBy: { startsAt: "asc" }, take: 8 }),
    db.inquiryRequest.findMany({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.nutritionRequest.count({ where: { assigneeId: null } }),
    db.guardianLink.count({ where: { status: "PENDING" } }),
    overallAttendance(null, 30),
  ]);
  return (
    <>
      <PageHeader title={`سلام ${v.name}`} subtitle="داشبورد مدیریت آکادمی" />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="ورزشکاران فعال" value={faNum(athletes)} href="/app/athletes?status=ACTIVE" />
        <Stat label="گروه‌ها / مربیان" value={`${faNum(groups.length)} / ${faNum(coaches)}`} href="/app/groups" />
        <Stat label="نرخ حضور ۳۰ روز" value={pct(att.rate)} hint={`${faNum(att.cancelledExcluded)} جلسه لغوشده محاسبه نشد`} href="/app/reports?period=month" />
        <Stat label="درخواست‌های باز" value={faNum(inquiries.length + unassignedNutrition + pendingLinks)} hint={`ثبت‌نام ${faNum(inquiries.length)} · تغذیه ${faNum(unassignedNutrition)} · سرپرستی ${faNum(pendingLinks)}`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="جلسات ۷ روز آینده" actions={<Link href="/app/calendar" className="link text-sm">تقویم</Link>}>
          {upcoming.length === 0 ? <Empty title="جلسه‌ای برنامه‌ریزی نشده" hint="از صفحه گروه‌ها جلسات را بسازید." /> : (
            <ul className="divide-y divide-slate-100 text-sm">{upcoming.map((s) => <li key={s.id} className="flex justify-between py-2"><span>{faDateTime(s.startsAt)} · {s.group.name}</span><SessionBadge s={s.status} /></li>)}</ul>
          )}
        </Section>
        <Section title="درخواست‌های ثبت‌نام و مشاوره" actions={<Link href="/app/admin/inquiries" className="link text-sm">همه</Link>}>
          {inquiries.length === 0 ? <Empty title="درخواست بازی نیست" /> : (
            <ul className="divide-y divide-slate-100 text-sm">{inquiries.map((i) => <li key={i.id} className="flex justify-between py-2"><span>{i.guardianName} · {i.kind === "REGISTRATION" ? "ثبت‌نام" : "مشاوره"}</span><Badge tone="amber">{REQUEST_STATUS_LABEL[i.status]}</Badge></li>)}</ul>
          )}
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {unassignedNutrition > 0 && <Link href="/app/nutrition" className="btn-secondary btn-sm">{faNum(unassignedNutrition)} درخواست تغذیه بدون ارجاع</Link>}
            {pendingLinks > 0 && <Link href="/app/admin/guardians" className="btn-secondary btn-sm">{faNum(pendingLinks)} سرپرست در انتظار تأیید</Link>}
          </div>
        </Section>
        <Section title="گروه‌ها و مربیان">
          <ul className="divide-y divide-slate-100 text-sm">
            {groups.map((g) => <li key={g.id} className="flex justify-between py-2"><Link href={`/app/groups/${g.id}`} className="link">{g.name}</Link><span className="text-slate-500">{g.coaches.map((c) => c.user.name).join("، ") || "بدون مربی"} · {faNum(g._count.athletes)} نفر</span></li>)}
          </ul>
        </Section>
        <Section title="گزارش‌های مدیریتی">
          <ul className="space-y-2 text-sm">
            <li><Link href="/app/reports?period=week" className="link">گزارش حضور هفتگی</Link></li>
            <li><Link href="/app/reports?period=month" className="link">گزارش حضور ماهانه</Link></li>
            <li><Link href="/app/admin/audit" className="link">گزارش ممیزی تغییرات حساس</Link></li>
            <li><Link href="/app/admin/seasons" className="link">فصل‌ها و نقاط عطف</Link></li>
          </ul>
        </Section>
      </div>
    </>
  );
}

// ───────────────── Coach / head coach ─────────────────
async function CoachDash({ v }: { v: Viewer }) {
  const today = startOfTehranDay(new Date());
  const groups = await db.group.findMany({ where: groupWhere(v), select: { id: true, name: true } });
  const groupIds = groups.map((g) => g.id);
  const [todays, upcoming, drafts, dryDrafts, threads, pains, results, att] = await Promise.all([
    db.trainingSession.findMany({ where: { AND: [sessionWhere(v), { startsAt: { gte: today, lt: new Date(+today + DAY) } }] }, include: { group: { select: { name: true } }, _count: { select: { attendance: true } } }, orderBy: { startsAt: "asc" } }),
    db.trainingSession.findMany({ where: { AND: [sessionWhere(v), { startsAt: { gte: new Date(+today + DAY), lt: new Date(+today + 7 * DAY) } }] }, include: { group: { select: { name: true } } }, orderBy: { startsAt: "asc" }, take: 6 }),
    db.workoutPlan.findMany({ where: { AND: [workoutPlanWhere(v), { status: "DRAFT" }] }, orderBy: { date: "asc" }, take: 6 }),
    db.drylandPlan.findMany({ where: { AND: [drylandPlanWhere(v), { status: "DRAFT" }] }, orderBy: { date: "asc" }, take: 4 }),
    unansweredThreads(v),
    db.drylandLog.findMany({ where: { pain: true, createdAt: { gte: new Date(Date.now() - 14 * DAY) }, athlete: athleteWhere(v) }, include: { athlete: { select: { id: true, user: { select: { name: true } } } }, item: { select: { planId: true, exercise: { select: { name: true } } } } }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.performanceResult.findMany({ where: { athlete: athleteWhere(v) }, select: { id: true, athleteId: true, stroke: true, distance: true, course: true, timeMs: true, type: true, date: true, isBaseline: true, athlete: { select: { groupId: true } } } }),
    overallAttendance(groupIds, 30),
  ]);

  // Group performance trend: per group, new PBs in the last 30 days and median improvement vs. baseline.
  const since = new Date(Date.now() - 30 * DAY);
  const trends = groups.map((g) => {
    const rs = results.filter((r) => r.athlete.groupId === g.id);
    const byAthleteEvent = new Map<string, typeof rs>();
    for (const r of rs) {
      const k = `${r.athleteId}|${eventKey(r)}`;
      byAthleteEvent.set(k, [...(byAthleteEvent.get(k) ?? []), r]);
    }
    const improvements: number[] = [];
    let newPbs = 0;
    for (const list of byAthleteEvent.values()) {
      const sorted = [...list].sort((a, b) => +a.date - +b.date);
      const base = sorted.find((r) => r.isBaseline) ?? sorted[0];
      const best = [...personalBests(sorted).values()][0];
      if (best && base && best.id !== base.id) improvements.push((base.timeMs - best.timeMs) / base.timeMs);
      if (best && best.date >= since && sorted.length > 1 && best.id !== sorted[0].id) newPbs++;
    }
    improvements.sort((a, b) => a - b);
    const median = improvements.length ? improvements[Math.floor(improvements.length / 2)] : null;
    return { g, newPbs, median, n: byAthleteEvent.size };
  });

  return (
    <>
      <PageHeader title={`سلام ${v.name}`} subtitle="داشبورد مربی" />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="جلسات امروز" value={faNum(todays.length)} href="/app/calendar" />
        <Stat label="برنامه‌های پیش‌نویس" value={faNum(drafts.length + dryDrafts.length)} href="/app/workouts?status=DRAFT" />
        <Stat label="پیام‌های بی‌پاسخ" value={faNum(threads.length)} href="/app/messages" />
        <Stat label="نرخ حضور گروه‌ها (۳۰ روز)" value={pct(att.rate)} href="/app/reports?period=month" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="امروز — ثبت سریع حضور">
          {todays.length === 0 ? <Empty title="امروز جلسه‌ای ندارید" /> : (
            <ul className="space-y-2">
              {todays.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 p-3">
                  <div><p className="font-medium">{faTime(s.startsAt)} · {s.group.name}</p><SessionBadge s={s.status} /></div>
                  {s.status !== "CANCELLED" && <Link href={`/app/attendance/${s.id}`} className="btn-primary">{s._count.attendance ? "ویرایش حضور" : "ثبت حضور"}</Link>}
                </li>
              ))}
            </ul>
          )}
          {upcoming.length > 0 && (
            <>
              <h3 className="mb-1 mt-4 text-sm font-bold text-slate-500">جلسات پیش رو</h3>
              <ul className="text-sm">{upcoming.map((s) => <li key={s.id} className="flex justify-between py-1"><span>{faDateTime(s.startsAt)} · {s.group.name}</span><SessionBadge s={s.status} /></li>)}</ul>
            </>
          )}
        </Section>
        <Section title="پیش‌نویس‌ها" actions={<Link href="/app/workouts/new" className="btn-secondary btn-sm">+ برنامه جدید</Link>}>
          {drafts.length + dryDrafts.length === 0 ? <Empty title="پیش‌نویسی ندارید" /> : (
            <ul className="divide-y divide-slate-100 text-sm">
              {drafts.map((p) => <li key={p.id} className="flex justify-between py-2"><Link href={`/app/workouts/${p.id}`} className="link">🌊 {p.title}</Link><span>{dateOnlyToJalaliString(p.date)} <PlanBadge s={p.status} /></span></li>)}
              {dryDrafts.map((p) => <li key={p.id} className="flex justify-between py-2"><Link href={`/app/dryland/${p.id}`} className="link">🏋 {p.title}</Link><span>{dateOnlyToJalaliString(p.date)} <PlanBadge s={p.status} /></span></li>)}
            </ul>
          )}
        </Section>
        <Section title="پیام‌های بی‌پاسخ">
          {threads.length === 0 ? <Empty title="همه پیام‌ها پاسخ داده شده‌اند" /> : (
            <ul className="divide-y divide-slate-100 text-sm">{threads.slice(0, 5).map((t) => <li key={t.id} className="py-2"><Link href={`/app/messages/${t.id}`} className="link">{t.subject}</Link><p className="truncate text-xs text-slate-500">{t.messages[0].author.name}: {t.messages[0].body}</p></li>)}</ul>
          )}
          {pains.length > 0 && (
            <div className="mt-4 rounded-xl bg-rose-50 p-3">
              <p className="mb-1 text-sm font-bold text-rose-800">⚠ گزارش‌های درد/ناراحتی (۱۴ روز)</p>
              <ul className="text-xs text-rose-900">{pains.map((p) => <li key={p.id}><Link href={`/app/dryland/${p.item.planId}`} className="underline">{p.athlete.user.name}</Link> — {p.item.exercise.name}{p.painNote ? `: ${p.painNote}` : ""}</li>)}</ul>
            </div>
          )}
        </Section>
        <Section title="روند عملکرد گروه‌ها">
          {trends.length === 0 ? <Empty title="گروهی ندارید" /> : (
            <table className="table">
              <thead><tr><th>گروه</th><th>رکورد شخصی جدید (۳۰ روز)</th><th>میانه بهبود نسبت به مبنا</th></tr></thead>
              <tbody>
                {trends.map((t) => (
                  <tr key={t.g.id}><td>{t.g.name}</td><td>{faNum(t.newPbs)}</td><td>{t.median === null ? "—" : <span className={t.median > 0 ? "text-emerald-700" : "text-rose-700"}>{t.median > 0 ? "▲" : "▼"} {faNum((t.median * 100).toFixed(1))}٪ سریع‌تر</span>}</td></tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-2 text-xs text-slate-500">فقط نتایج قابل مقایسه (شنا، مسافت و نوع استخر یکسان) با هم سنجیده می‌شوند.</p>
        </Section>
      </div>
    </>
  );
}

// ───────────────── Nutritionist ─────────────────
async function NutritionDash({ v }: { v: Viewer }) {
  const reqs = await db.nutritionRequest.findMany({ where: { assigneeId: v.id }, include: { athlete: { select: { user: { select: { name: true } } } } }, orderBy: { createdAt: "desc" } });
  const open = reqs.filter((r) => r.status !== "ANSWERED" && r.status !== "CLOSED");
  return (
    <>
      <PageHeader title={`سلام ${v.name}`} subtitle="شما فقط درخواست‌هایی را می‌بینید که به شما ارجاع شده است." />
      <div className="mb-4 grid grid-cols-2 gap-3"><Stat label="در انتظار پاسخ" value={faNum(open.length)} href="/app/nutrition" /><Stat label="کل درخواست‌های ارجاعی" value={faNum(reqs.length)} /></div>
      <Section title="درخواست‌های در انتظار">
        {open.length === 0 ? <Empty title="درخواست در انتظاری نیست" /> : (
          <ul className="divide-y divide-slate-100 text-sm">{open.map((r) => <li key={r.id} className="flex justify-between py-2"><Link href={`/app/nutrition/${r.id}`} className="link">{r.topic}</Link><span className="text-slate-500">{r.athlete.user.name}</span></li>)}</ul>
        )}
      </Section>
    </>
  );
}

// ───────────────── Athlete / guardian ─────────────────
async function FamilyDash({ v }: { v: Viewer }) {
  const athletes = await db.athlete.findMany({ where: athleteWhere(v), include: { user: { select: { name: true } }, group: { select: { name: true } } } });
  const [notifications, threads, pendingLinks] = await Promise.all([
    db.notification.findMany({ where: { userId: v.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    unansweredThreads(v),
    v.role === "GUARDIAN" ? db.guardianLink.count({ where: { guardianId: v.id, status: "PENDING" } }) : 0,
  ]);
  return (
    <>
      <PageHeader title={`سلام ${v.name}`} subtitle={v.role === "GUARDIAN" ? "داشبورد خانواده" : "داشبورد ورزشکار"} />
      {athletes.length === 0 && (
        <Empty title={v.role === "GUARDIAN" ? "هنوز ورزشکار تأییدشده‌ای به حساب شما متصل نیست" : "پروفایل ورزشکار یافت نشد"} hint={pendingLinks ? `${faNum(pendingLinks)} درخواست در انتظار تأیید آکادمی` : undefined}
          action={v.role === "GUARDIAN" && <Link href="/app/family" className="btn-primary">درخواست اتصال</Link>} />
      )}
      <div className="space-y-6">
        {athletes.map((a) => <AthleteBlock key={a.id} v={v} a={a} showName={v.role === "GUARDIAN"} />)}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Section title="اعلان‌ها" actions={<Link href="/app/notifications" className="link text-sm">همه</Link>}>
          {notifications.length === 0 ? <Empty title="اعلانی ندارید" /> : (
            <ul className="divide-y divide-slate-100 text-sm">{notifications.map((n) => <li key={n.id} className={`py-2 ${n.readAt ? "text-slate-500" : "font-medium"}`}>{!n.readAt && "● "}{n.link ? <Link href={n.link} className="hover:underline">{n.title}</Link> : n.title}<span className="ms-2 text-xs font-normal text-slate-400">{faDateTime(n.createdAt)}</span></li>)}</ul>
          )}
        </Section>
        <Section title="پیام‌ها" actions={<Link href="/app/messages" className="link text-sm">همه</Link>}>
          {threads.length === 0 ? <Empty title="پیام خوانده‌نشده‌ای ندارید" /> : (
            <ul className="divide-y divide-slate-100 text-sm">{threads.slice(0, 5).map((t) => <li key={t.id} className="py-2"><Link href={`/app/messages/${t.id}`} className="link">{t.subject}</Link><p className="truncate text-xs text-slate-500">{t.messages[0].author.name}: {t.messages[0].body}</p></li>)}</ul>
          )}
        </Section>
      </div>
    </>
  );
}

async function AthleteBlock({ v, a, showName }: { v: Viewer; a: { id: string; groupId: string | null; user: { name: string }; group: { name: string } | null }; showName: boolean }) {
  const season = await db.season.findFirst({ where: { active: true } });
  const [next, plans, sessions, results, targets, settings] = await Promise.all([
    a.groupId ? db.trainingSession.findFirst({ where: { groupId: a.groupId, startsAt: { gte: new Date() }, status: { not: "CANCELLED" } }, orderBy: { startsAt: "asc" } }) : null,
    db.workoutPlan.findMany({ where: { AND: [workoutPlanWhere(v), { OR: [{ athleteId: a.id }, { groupId: a.groupId ?? "__none__" }] }] }, orderBy: { date: "desc" }, take: 4 }),
    a.groupId ? db.trainingSession.findMany({ where: { groupId: a.groupId, startsAt: { gte: new Date(Date.now() - 30 * DAY), lte: new Date() } }, include: { attendance: { where: { athleteId: a.id } } }, orderBy: { startsAt: "desc" } }) : [],
    db.performanceResult.findMany({ where: { athleteId: a.id, athlete: athleteWhere(v) }, orderBy: { date: "desc" } }),
    season ? db.seasonTarget.findMany({ where: { athleteId: a.id, seasonId: season.id } }) : [],
    db.academySetting.findUnique({ where: { id: 1 } }),
  ]);
  const att = attendanceSummary(sessions.map((s) => ({ sessionStatus: s.status, status: s.attendance[0]?.status ?? null })), { countExcusedAsAbsent: settings?.countExcusedAsAbsent });
  const perf = performanceView(results, targets);
  const lastSession = sessions.find((s) => s.status !== "CANCELLED" && s.attendance[0]);
  const pbIds = new Set([...perf.pbs.values()].map((r) => r.id));

  return (
    <div>
      {showName && <h2 className="mb-2 text-lg font-bold"><Link href={`/app/athletes/${a.id}`} className="hover:underline">{a.user.name}</Link> <span className="text-sm font-normal text-slate-500">· {a.group?.name}</span></h2>}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="جلسه بعدی" value={next ? faTime(next.startsAt) : "—"} hint={next ? faDateTime(next.startsAt) : "جلسه‌ای برنامه‌ریزی نشده"} href="/app/calendar" />
        <Stat label="نرخ حضور ۳۰ روز" value={pct(att.rate)} hint={`${faNum(att.attended)} از ${faNum(att.eligible)} جلسه`} href="/app/reports?period=month" />
        <Stat label="آخرین وضعیت حضور" value={lastSession ? <AttendanceBadge s={lastSession.attendance[0].status} /> : "—"} hint={lastSession ? faDateTime(lastSession.startsAt) : undefined} />
        <Stat label="رکوردهای شخصی" value={faNum(perf.pbs.size)} href={`/app/performance?athlete=${a.id}`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="برنامه‌های منتشرشده" actions={<Link href="/app/workouts" className="link text-sm">همه</Link>}>
          {plans.length === 0 ? <Empty title="برنامه منتشرشده‌ای نیست" /> : (
            <ul className="divide-y divide-slate-100 text-sm">{plans.map((p) => <li key={p.id} className="flex justify-between py-2"><Link href={`/app/workouts/${p.id}`} className="link">{p.title}</Link><span className="text-slate-500">{dateOnlyToJalaliString(p.date)} · {faNum(p.plannedMeters)} متر</span></li>)}</ul>
          )}
        </Section>
        <Section title="رکوردهای اخیر">
          {results.length === 0 ? <Empty title="هنوز زمانی ثبت نشده" /> : (
            <ul className="divide-y divide-slate-100 text-sm">
              {results.slice(0, 5).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 py-2">
                  <span>{eventLabel(r)}<span className="block text-xs text-slate-500">{dateOnlyToJalaliString(r.date)}</span></span>
                  <span className="flex items-center gap-2"><b dir="ltr">{formatTime(r.timeMs)}</b>{pbIds.has(r.id) && <Badge tone="amber">PB</Badge>}<ResultTypeBadge s={r.type} /></span>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <div className="lg:col-span-2">
          <Section title="نمودار عملکرد">
            <PerformanceChart results={perf.chart} refs={perf.refs} />
          </Section>
        </div>
      </div>
    </div>
  );
}
