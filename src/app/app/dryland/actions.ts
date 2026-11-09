"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { guarded } from "@/server/action-guard";
import { audit } from "@/server/audit";
import { assertCanAssign, drylandPlanWhere } from "@/server/authz";
import { athleteAudience, coachesOfAthlete, notify } from "@/server/notify";
import { ForbiddenError, STAFF } from "@/server/viewer";
import { formObject } from "@/lib/action";
import { checkbox, int, jalaliDate, opt, optInt, req } from "@/lib/zod-fa";

export const addExercise = guarded(STAFF, async (v, _p: unknown, fd: FormData) => {
  const d = z.object({
    name: req("نام حرکت"), muscleGroup: req("گروه عضلانی"), description: opt, safetyNotes: opt,
    mediaUrl: z.string().trim().url("نشانی معتبر نیست").refine((u) => u.startsWith("https://"), "فقط نشانی https").optional().or(z.literal("")).transform((s) => s || null),
  }).parse(formObject(fd));
  const e = await db.exercise.create({ data: d });
  await audit(v.id, "exercise.create", "Exercise", e.id, null, d);
  revalidatePath("/app/dryland");
  return { ok: true, message: "حرکت به کتابخانه اضافه شد." };
});

export const createDrylandPlan = guarded(STAFF, async (v, _p: unknown, fd: FormData) => {
  const raw = formObject(fd);
  const d = z.object({ title: req("عنوان"), target: req("گروه یا ورزشکار"), date: jalaliDate(), notes: opt, publish: checkbox }).parse(raw);
  const [kind, id] = d.target.split(":");
  const target = { groupId: kind === "group" ? id : null, athleteId: kind === "athlete" ? id : null };
  await assertCanAssign(v, target);
  const items = [];
  for (let i = 0; i < 8; i++) {
    if (!raw[`ex${i}`]) continue;
    items.push(z.object({
      exerciseId: z.string(), order: z.literal(i), sets: int("ست", 1, 20), reps: optInt("تکرار", 1, 200), durationSec: optInt("مدت", 1, 3600), restSec: optInt("استراحت", 0, 600), notes: opt,
    }).parse({ exerciseId: raw[`ex${i}`], order: i, sets: raw[`sets${i}`], reps: raw[`reps${i}`], durationSec: raw[`dur${i}`], restSec: raw[`rest${i}`], notes: raw[`notes${i}`] }));
  }
  if (!items.length) return { ok: false, message: "حداقل یک حرکت انتخاب کنید." };
  const plan = await db.drylandPlan.create({
    data: { title: d.title, ...target, date: d.date, notes: d.notes, status: d.publish ? "PUBLISHED" : "DRAFT", authorId: v.id, items: { create: items } },
  });
  if (d.publish) await publishNotify(plan);
  revalidatePath("/app/dryland");
  return { ok: true, message: "برنامه ذخیره شد.", redirectTo: `/app/dryland/${plan.id}` };
});

async function publishNotify(plan: { id: string; title: string; groupId: string | null; athleteId: string | null }) {
  const ids = plan.athleteId ? [plan.athleteId] : (await db.athlete.findMany({ where: { groupId: plan.groupId!, status: { in: ["ACTIVE", "TRIAL"] } }, select: { id: true } })).map((a) => a.id);
  await notify(await athleteAudience(ids), { type: "PLAN_PUBLISHED", title: "برنامه تمرین خشکی منتشر شد", body: plan.title, link: `/app/dryland/${plan.id}` });
}

export const publishDryland = guarded(STAFF, async (v, planId: string) => {
  const plan = await db.drylandPlan.findFirst({ where: { AND: [{ id: planId }, drylandPlanWhere(v)] } });
  if (!plan) throw new ForbiddenError();
  await db.drylandPlan.update({ where: { id: planId }, data: { status: "PUBLISHED" } });
  await audit(v.id, "dryland.publish", "DrylandPlan", planId, { status: plan.status }, { status: "PUBLISHED" });
  await publishNotify(plan);
  revalidatePath(`/app/dryland/${planId}`);
  return { ok: true };
});

export const logDryland = guarded(["ATHLETE"], async (v, itemId: string, _p: unknown, fd: FormData) => {
  const athlete = await db.athlete.findUnique({ where: { userId: v.id } });
  const item = await db.drylandItem.findUnique({ where: { id: itemId }, include: { exercise: true } });
  if (!athlete || !item) throw new ForbiddenError();
  if (!(await db.drylandPlan.count({ where: { AND: [{ id: item.planId }, drylandPlanWhere(v)] } }))) throw new ForbiddenError();
  const d = z.object({ completed: checkbox, difficulty: optInt("سختی", 1, 10), pain: checkbox, painNote: opt.pipe(z.string().max(500).nullable()) }).parse(formObject(fd));
  const prev = await db.drylandLog.findUnique({ where: { itemId_athleteId: { itemId, athleteId: athlete.id } } });
  await db.drylandLog.upsert({ where: { itemId_athleteId: { itemId, athleteId: athlete.id } }, create: { itemId, athleteId: athlete.id, ...d }, update: d });
  if (d.pain && !prev?.pain) {
    const guardians = (await athleteAudience([athlete.id])).filter((id) => id !== v.id);
    await notify([...(await coachesOfAthlete(athlete.id)), ...guardians], {
      type: "PAIN_FLAG", title: `⚠ گزارش درد/ناراحتی: ${v.name}`, body: `${item.exercise.name}${d.painNote ? ` — ${d.painNote}` : ""}`, link: `/app/dryland/${item.planId}`,
    });
  }
  revalidatePath(`/app/dryland/${item.planId}`);
  return { ok: true, message: d.pain ? "ثبت شد و به مربی اطلاع داده شد. تا بررسی مربی، این حرکت را ادامه ندهید." : "ثبت شد." };
});

