"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { guarded } from "@/server/action-guard";
import { audit } from "@/server/audit";
import { canManageGroup } from "@/server/authz";
import { ForbiddenError, STAFF } from "@/server/viewer";
import { formObject } from "@/lib/action";
import { int, opt, req } from "@/lib/zod-fa";
import { jsDayToIran } from "@/lib/domain/labels";

const hhmm = z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/, "ساعت را به شکل ۱۶:۳۰ وارد کنید");

export const createGroup = guarded(["ADMIN"], async (v, _p: unknown, fd: FormData) => {
  const d = z.object({ name: req("نام گروه"), level: opt, location: opt, description: opt }).parse(formObject(fd));
  const g = await db.group.create({ data: d });
  await audit(v.id, "group.create", "Group", g.id, null, d);
  revalidatePath("/app/groups");
  return { ok: true, message: "گروه ایجاد شد.", redirectTo: `/app/groups/${g.id}` };
});

export const updateGroup = guarded(["ADMIN"], async (v, groupId: string, _p: unknown, fd: FormData) => {
  const d = z.object({ name: req("نام گروه"), level: opt, location: opt, description: opt }).parse(formObject(fd));
  const before = await db.group.findUniqueOrThrow({ where: { id: groupId } });
  await db.group.update({ where: { id: groupId }, data: d });
  await audit(v.id, "group.update", "Group", groupId, before, d);
  revalidatePath(`/app/groups/${groupId}`);
  return { ok: true, message: "ذخیره شد." };
});

export const setGroupCoach = guarded(["ADMIN"], async (v, groupId: string, _p: unknown, fd: FormData) => {
  const d = z.object({ userId: req("مربی"), op: z.enum(["add", "remove"]) }).parse(formObject(fd));
  const coach = await db.user.findFirst({ where: { id: d.userId, role: { in: ["COACH", "HEAD_COACH"] } } });
  if (!coach) throw new ForbiddenError("کاربر انتخاب‌شده مربی نیست");
  if (d.op === "add") await db.groupCoach.upsert({ where: { groupId_userId: { groupId, userId: d.userId } }, create: { groupId, userId: d.userId }, update: {} });
  else await db.groupCoach.deleteMany({ where: { groupId, userId: d.userId } });
  await audit(v.id, `group.coach.${d.op}`, "Group", groupId, null, { coachId: d.userId });
  revalidatePath(`/app/groups/${groupId}`);
  return { ok: true, message: "مربیان گروه به‌روزرسانی شد." };
});

export const addSlot = guarded(["ADMIN"], async (v, groupId: string, _p: unknown, fd: FormData) => {
  const settings = await db.academySetting.findUnique({ where: { id: 1 } });
  const d = z.object({ weekday: int("روز", 0, 6), startTime: hhmm, minutes: int("مدت", 15, 300).optional(), location: opt }).parse(formObject(fd));
  await db.weeklySlot.create({ data: { groupId, ...d, minutes: d.minutes ?? settings?.sessionMinutes ?? 120 } });
  await audit(v.id, "group.slot.add", "Group", groupId, null, d);
  revalidatePath(`/app/groups/${groupId}`);
  return { ok: true, message: "زمان هفتگی اضافه شد." };
});

export const removeSlot = guarded(["ADMIN"], async (v, slotId: string) => {
  const s = await db.weeklySlot.delete({ where: { id: slotId } });
  await audit(v.id, "group.slot.remove", "Group", s.groupId, s, null);
  revalidatePath(`/app/groups/${s.groupId}`);
  return { ok: true };
});

/** Creates sessions from the weekly slots for the next N weeks, skipping ones that already exist. */
export const generateSessions = guarded(STAFF, async (v, groupId: string, _p: unknown, fd: FormData) => {
  if (!(await canManageGroup(v, groupId))) throw new ForbiddenError();
  const { weeks } = z.object({ weeks: int("تعداد هفته", 1, 12) }).parse(formObject(fd));
  const g = await db.group.findUniqueOrThrow({ where: { id: groupId }, include: { slots: true } });
  if (!g.slots.length) return { ok: false, message: "ابتدا زمان‌بندی هفتگی گروه را تعریف کنید." };
  const now = new Date();
  let created = 0;
  for (let d = 0; d < weeks * 7; d++) {
    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + d));
    for (const s of g.slots.filter((x) => x.weekday === jsDayToIran(day.getUTCDay()))) {
      const [h, m] = s.startTime.split(":").map(Number);
      const startsAt = new Date(day.getTime() + (h * 60 + m - 210) * 60000);
      if (startsAt < now) continue;
      const exists = await db.trainingSession.count({ where: { groupId, startsAt } });
      if (exists) continue;
      await db.trainingSession.create({ data: { groupId, startsAt, minutes: s.minutes, location: s.location ?? g.location } });
      created++;
    }
  }
  revalidatePath("/app/calendar");
  return { ok: true, message: `${created.toLocaleString("fa-IR")} جلسه ایجاد شد.` };
});
