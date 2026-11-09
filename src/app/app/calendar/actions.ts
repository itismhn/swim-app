"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { guarded } from "@/server/action-guard";
import { audit } from "@/server/audit";
import { canManageGroup, canTakeAttendance } from "@/server/authz";
import { athleteAudience, notify } from "@/server/notify";
import { ForbiddenError, STAFF } from "@/server/viewer";
import { formObject } from "@/lib/action";
import { int, opt, req } from "@/lib/zod-fa";
import { faDateTime, tehranDateTimeToUtc } from "@/lib/domain/jalali";

async function notifyGroup(groupId: string, title: string, body: string) {
  const athletes = await db.athlete.findMany({ where: { groupId, status: { in: ["ACTIVE", "TRIAL"] } }, select: { id: true } });
  await notify(await athleteAudience(athletes.map((a) => a.id)), { type: "SCHEDULE_CHANGED", title, body, link: "/app/calendar" });
}

const when = z.object({ date: req("تاریخ"), time: req("ساعت") }).transform((d, ctx) => {
  const at = tehranDateTimeToUtc(d.date, d.time);
  if (!at) {
    ctx.addIssue({ code: "custom", path: ["date"], message: "تاریخ یا ساعت نامعتبر است (مثال: ۱۴۰۵/۰۸/۲۰ و 16:00)" });
    return z.NEVER;
  }
  return at;
});

export const createSession = guarded(STAFF, async (v, _p: unknown, fd: FormData) => {
  const raw = formObject(fd);
  const d = z.object({ groupId: req("گروه"), minutes: int("مدت", 15, 300), location: opt, note: opt }).parse(raw);
  const startsAt = when.parse(raw);
  if (!(await canManageGroup(v, d.groupId))) throw new ForbiddenError();
  const s = await db.trainingSession.create({ data: { ...d, startsAt } });
  await audit(v.id, "session.create", "TrainingSession", s.id, null, { ...d, startsAt });
  await notifyGroup(d.groupId, "جلسه جدید اضافه شد", faDateTime(startsAt));
  revalidatePath("/app/calendar");
  return { ok: true, message: "جلسه ایجاد شد." };
});

export const setSessionStatus = guarded(STAFF, async (v, sessionId: string, _p: unknown, fd: FormData) => {
  if (!(await canTakeAttendance(v, sessionId))) throw new ForbiddenError();
  const d = z.object({ status: z.enum(["SCHEDULED", "CANCELLED", "COMPLETED"]), note: opt }).parse(formObject(fd));
  const before = await db.trainingSession.findUniqueOrThrow({ where: { id: sessionId } });
  await db.trainingSession.update({ where: { id: sessionId }, data: { status: d.status, note: d.note ?? before.note } });
  await audit(v.id, "session.status", "TrainingSession", sessionId, { status: before.status }, d);
  if (d.status === "CANCELLED") await notifyGroup(before.groupId, "جلسه تمرین لغو شد", `${faDateTime(before.startsAt)}${d.note ? ` — ${d.note}` : ""}`);
  revalidatePath("/app/calendar");
  return { ok: true, message: "وضعیت جلسه به‌روزرسانی شد." };
});

export const rescheduleSession = guarded(STAFF, async (v, sessionId: string, _p: unknown, fd: FormData) => {
  if (!(await canTakeAttendance(v, sessionId))) throw new ForbiddenError();
  const startsAt = when.parse(formObject(fd));
  const before = await db.trainingSession.findUniqueOrThrow({ where: { id: sessionId } });
  await db.trainingSession.update({ where: { id: sessionId }, data: { startsAt } });
  await audit(v.id, "session.reschedule", "TrainingSession", sessionId, { startsAt: before.startsAt }, { startsAt });
  await notifyGroup(before.groupId, "تغییر زمان جلسه", `از ${faDateTime(before.startsAt)} به ${faDateTime(startsAt)}`);
  revalidatePath("/app/calendar");
  return { ok: true, message: "زمان جلسه تغییر کرد و به ورزشکاران و خانواده‌ها اطلاع داده شد." };
});
