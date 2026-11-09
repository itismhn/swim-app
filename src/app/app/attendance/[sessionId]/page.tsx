import { notFound } from "next/navigation";
import { getViewer, requireViewer } from "@/server/auth";
import { db } from "@/server/db";
import { sessionWhere } from "@/server/authz";
import { STAFF } from "@/server/viewer";
import { AttendanceBadge, SessionBadge } from "@/components/badges";
import { Empty, PageHeader, Section } from "@/components/ui";
import { faDateTime } from "@/lib/domain/jalali";
import { AttendanceSheet } from "../AttendanceSheet";


/** Title is loaded through the same scoped query, so it never reveals a record the viewer can't see. */
export async function generateMetadata({ params }: { params: Promise<{ sessionId: string }> }) {
  const v = await getViewer();
  if (!v) return {};
  const { sessionId } = await params;
  const x = await db.trainingSession.findFirst({ where: { AND: [{ id: sessionId }, sessionWhere(v)] }, select: { group: { select: { name: true } } } });
  return { title: (x ? `حضور و غیاب — ${x.group.name}` : undefined) ?? "یافت نشد" };
}

export default async function AttendancePage({ params }: { params: Promise<{ sessionId: string }> }) {
  const v = await requireViewer(STAFF);
  const { sessionId } = await params;
  const s = await db.trainingSession.findFirst({ where: { AND: [{ id: sessionId }, sessionWhere(v)] }, include: { group: { select: { name: true } } } });
  if (!s) notFound();
  const [athletes, records] = await Promise.all([
    db.athlete.findMany({ where: { groupId: s.groupId, status: { in: ["ACTIVE", "TRIAL"] } }, include: { user: { select: { name: true } } }, orderBy: { user: { name: "asc" } } }),
    db.attendance.findMany({
      where: { sessionId },
      include: { recordedBy: { select: { name: true } }, history: { orderBy: { changedAt: "desc" } }, athlete: { include: { user: { select: { name: true } } } } },
    }),
  ]);
  const byAthlete = new Map(records.map((r) => [r.athleteId, r]));
  const userNames = new Map((await db.user.findMany({ where: { id: { in: [...new Set(records.flatMap((r) => r.history.map((h) => h.changedById)))] } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]));

  return (
    <>
      <PageHeader title={`حضور و غیاب — ${s.group.name}`} subtitle={<>{faDateTime(s.startsAt)} <SessionBadge s={s.status} /></>} />
      {s.status === "CANCELLED" ? (
        <Empty title="این جلسه لغو شده است" hint="جلسات لغوشده در محاسبه نرخ حضور لحاظ نمی‌شوند." />
      ) : athletes.length === 0 ? (
        <Empty title="ورزشکار فعالی در این گروه نیست" />
      ) : (
        <AttendanceSheet sessionId={s.id} athletes={athletes.map((a) => ({ id: a.id, name: a.user.name, status: byAthlete.get(a.id)?.status ?? null, note: byAthlete.get(a.id)?.note ?? null }))} />
      )}
      {records.some((r) => r.history.length > 0) && (
        <div className="mt-6">
          <Section title="سابقه ثبت و ویرایش">
            <ul className="space-y-2 text-sm">
              {records.flatMap((r) => r.history.map((h) => (
                <li key={h.id} className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="font-medium">{r.athlete.user.name}</span>
                  {h.fromStatus ? <><AttendanceBadge s={h.fromStatus} /> ← </> : null}<AttendanceBadge s={h.toStatus} />
                  <span className="text-xs text-slate-500">{userNames.get(h.changedById)} · {faDateTime(h.changedAt)}{h.note ? ` · ${h.note}` : ""}</span>
                </li>
              )))}
            </ul>
          </Section>
        </div>
      )}
    </>
  );
}
