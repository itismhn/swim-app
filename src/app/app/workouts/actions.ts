"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { guarded } from "@/server/action-guard";
import { audit } from "@/server/audit";
import { assertCanAssign, canEditWorkoutPlan, workoutPlanWhere } from "@/server/authz";
import { athleteAudience, coachesOfAthlete, notify } from "@/server/notify";
import { ForbiddenError, STAFF } from "@/server/viewer";
import { parseJalaliDate } from "@/lib/domain/jalali";
import { planMeters } from "@/lib/domain/volume";
import { planSchema } from "@/lib/workout-schema";
import { formObject } from "@/lib/action";
import { int, opt } from "@/lib/zod-fa";

async function audienceOf(plan: { groupId: string | null; athleteId: string | null }) {
  const ids = plan.athleteId
    ? [plan.athleteId]
    : (await db.athlete.findMany({ where: { groupId: plan.groupId!, status: { in: ["ACTIVE", "TRIAL"] } }, select: { id: true } })).map((a) => a.id);
  return athleteAudience(ids);
}

/**
 * Creates or updates a workout plan. Planned volume is recomputed on the server
 * from the validated sets (client totals are never trusted). Every save writes a revision.
 */
export const saveWorkoutPlan = guarded(STAFF, async (v, planId: string | null, input: unknown, publish: boolean) => {
  const data = planSchema.parse(input);
  const date = parseJalaliDate(data.date);
  if (!date) return { ok: false, message: "تاریخ نامعتبر است", fieldErrors: { date: "تاریخ نامعتبر است (مثال: 1405/08/20)" } };
  const [kind, targetId] = data.target.split(":");
  const target = { groupId: kind === "group" ? targetId : null, athleteId: kind === "athlete" ? targetId : null };
  await assertCanAssign(v, target);

  // Equipment ids must exist.
  const eqIds = [...new Set(data.sections.flatMap((s) => s.sets.flatMap((x) => x.equipment)))];
  if (eqIds.length && (await db.equipment.count({ where: { id: { in: eqIds } } })) !== eqIds.length) throw new ForbiddenError("تجهیزات نامعتبر");

  const plannedMeters = planMeters(data.sections);
  let prev = null as null | { status: string; version: number };
  if (planId) {
    if (!(await canEditWorkoutPlan(v, planId))) throw new ForbiddenError();
    prev = await db.workoutPlan.findUniqueOrThrow({ where: { id: planId }, select: { status: true, version: true } });
  }
  const status = publish ? "PUBLISHED" : "DRAFT";

  const plan = await db.$transaction(async (tx) => {
    const base = { title: data.title, ...target, date, poolLength: data.poolLength, notes: data.notes, plannedMeters, status, publishedAt: publish ? new Date() : null } as const;
    const p = planId
      ? await tx.workoutPlan.update({ where: { id: planId }, data: { ...base, version: { increment: 1 } } })
      : await tx.workoutPlan.create({ data: { ...base, authorId: v.id } });
    if (planId) await tx.workoutSection.deleteMany({ where: { planId } });
    for (const [si, s] of data.sections.entries()) {
      await tx.workoutSection.create({
        data: {
          planId: p.id, kind: s.kind, order: si, title: s.title,
          sets: {
            create: s.sets.map((x, xi) => ({
              order: xi, rounds: x.rounds, reps: x.reps, stroke: x.stroke, intensity: x.intensity, restSec: x.restSec, sendOffSec: x.sendOffSec, focus: x.focus, notes: x.notes,
              segments: { create: x.segments.map((g, gi) => ({ order: gi, meters: g.meters, description: g.description })) },
              equipment: { create: x.equipment.map((equipmentId) => ({ equipmentId })) },
            })),
          },
        },
      });
    }
    await tx.workoutPlanRevision.create({
      data: { planId: p.id, version: p.version, status, snapshot: { ...data, plannedMeters } as unknown as Prisma.InputJsonValue, authorId: v.id },
    });
    return p;
  });

  if (publish) {
    await audit(v.id, "workout.publish", "WorkoutPlan", plan.id, prev, { version: plan.version, plannedMeters });
    await notify(await audienceOf(plan), {
      type: "PLAN_PUBLISHED",
      title: prev?.status === "PUBLISHED" ? "برنامه تمرین به‌روزرسانی شد" : "برنامه تمرین جدید منتشر شد",
      body: `${plan.title} — ${plannedMeters.toLocaleString("fa-IR")} متر`,
      link: `/app/workouts/${plan.id}`,
    });
  }
  revalidatePath("/app/workouts");
  return {
    ok: true,
    message: publish ? "برنامه منتشر شد و به ورزشکاران و خانواده‌ها اطلاع داده شد." : "پیش‌نویس ذخیره شد.",
    redirectTo: planId ? undefined : `/app/workouts/${plan.id}`,
  };
});

export const addEquipment = guarded(STAFF, async (v, name: unknown) => {
  const n = z.string().trim().min(2, "نام تجهیزات کوتاه است").max(40).parse(name);
  const key = `CUSTOM_${n.replace(/\s+/g, "_")}`;
  const e = await db.equipment.upsert({ where: { key }, create: { key, name: n }, update: {} });
  await audit(v.id, "equipment.add", "Equipment", e.id, null, { name: n });
  return { ok: true, data: { id: e.id, name: e.name } };
});

/** Athlete logs what they actually swam (stored separately from planned volume). */
export const logCompletion = guarded(["ATHLETE"], async (v, planId: string, _p: unknown, fd: FormData) => {
  const athlete = await db.athlete.findUnique({ where: { userId: v.id } });
  if (!athlete) throw new ForbiddenError();
  const plan = await db.workoutPlan.findFirst({ where: { AND: [{ id: planId }, workoutPlanWhere(v)] } });
  if (!plan) throw new ForbiddenError();
  const d = z.object({ actualMeters: int("متراژ انجام‌شده", 0, 20000), rpe: int("میزان سختی", 1, 10), feedback: opt.pipe(z.string().max(1000).nullable()) }).parse(formObject(fd));
  await db.workoutCompletion.upsert({
    where: { planId_athleteId: { planId, athleteId: athlete.id } },
    create: { planId, athleteId: athlete.id, ...d },
    update: d,
  });
  await notify(await coachesOfAthlete(athlete.id), { type: "REPLY", title: `گزارش تمرین از ${v.name}`, body: d.feedback ?? undefined, link: `/app/workouts/${planId}` });
  revalidatePath(`/app/workouts/${planId}`);
  return { ok: true, message: "گزارش شما ثبت شد." };
});

export const replyToCompletion = guarded(STAFF, async (v, completionId: string, _p: unknown, fd: FormData) => {
  const c = await db.workoutCompletion.findUniqueOrThrow({ where: { id: completionId } });
  if (!(await canEditWorkoutPlan(v, c.planId))) throw new ForbiddenError();
  const { coachReply } = z.object({ coachReply: z.string().trim().min(1, "پاسخ خالی است").max(1000) }).parse(formObject(fd));
  await db.workoutCompletion.update({ where: { id: completionId }, data: { coachReply } });
  await notify(await athleteAudience([c.athleteId]), { type: "REPLY", title: "مربی به بازخورد تمرین پاسخ داد", body: coachReply, link: `/app/workouts/${c.planId}` });
  revalidatePath(`/app/workouts/${c.planId}`);
  return { ok: true, message: "پاسخ ارسال شد." };
});
