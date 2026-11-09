"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { guarded } from "@/server/action-guard";

import { canTakeAttendance } from "@/server/authz";
import { ForbiddenError, STAFF } from "@/server/viewer";

const entries = z.array(
  z.object({
    athleteId: z.string().min(1),
    status: z.enum(["PRESENT", "ABSENT", "EXCUSED", "LATE", "LEFT_EARLY"]),
    note: z.string().trim().max(300).optional().transform((s) => s || null),
  }),
).max(200);

/**
 * Saves a whole attendance sheet. Each change writes an AttendanceHistory row;
 * edits to an existing record are also written to the audit log.
 */
export const saveAttendance = guarded(STAFF, async (v, sessionId: string, input: unknown) => {
  if (!(await canTakeAttendance(v, sessionId))) throw new ForbiddenError();
  const rows = entries.parse(input);
  const session = await db.trainingSession.findUniqueOrThrow({ where: { id: sessionId } });
  if (session.status === "CANCELLED") return { ok: false, message: "این جلسه لغو شده است؛ حضور و غیاب ثبت نمی‌شود." };

  // Only athletes of this session's group may be recorded.
  const roster = new Set((await db.athlete.findMany({ where: { groupId: session.groupId }, select: { id: true } })).map((a) => a.id));
  if (rows.some((r) => !roster.has(r.athleteId))) throw new ForbiddenError("ورزشکار خارج از این گروه است");

  const existing = new Map((await db.attendance.findMany({ where: { sessionId } })).map((a) => [a.athleteId, a]));
  let changed = 0;
  await db.$transaction(async (tx) => {
    for (const r of rows) {
      const prev = existing.get(r.athleteId);
      if (prev && prev.status === r.status && (prev.note ?? null) === r.note) continue;
      const rec = await tx.attendance.upsert({
        where: { sessionId_athleteId: { sessionId, athleteId: r.athleteId } },
        create: { sessionId, athleteId: r.athleteId, status: r.status, note: r.note, recordedById: v.id },
        update: { status: r.status, note: r.note, recordedById: v.id, recordedAt: new Date() },
      });
      await tx.attendanceHistory.create({ data: { attendanceId: rec.id, fromStatus: prev?.status ?? null, toStatus: r.status, note: r.note, changedById: v.id } });
      if (prev) {
        await tx.auditLog.create({ data: { actorId: v.id, action: "attendance.edit", entity: "Attendance", entityId: rec.id, before: { status: prev.status, note: prev.note }, after: { status: r.status, note: r.note } } });
      }
      changed++;
    }
    if (session.status === "SCHEDULED" && session.startsAt <= new Date()) {
      await tx.trainingSession.update({ where: { id: sessionId }, data: { status: "COMPLETED" } });
    }
  });
  revalidatePath(`/app/attendance/${sessionId}`);
  return { ok: true, message: changed ? `${changed.toLocaleString("fa-IR")} مورد ذخیره شد.` : "تغییری نبود." };
});

