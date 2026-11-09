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
import { readMediaFile } from "@/server/media";
import { checkbox, jalaliDate, opt, optInt, req } from "@/lib/zod-fa";

export const addExercise = guarded(STAFF, async (v, _p: unknown, fd: FormData) => {
  const d = z.object({
    name: req("نام حرکت"), muscleGroup: req("گروه عضلانی"), description: opt, safetyNotes: opt,
    mediaUrl: z.string().trim().url("نشانی معتبر نیست").refine((u) => u.startsWith("https://"), "فقط نشانی https").optional().or(z.literal("")).transform((s) => s || null),
  }).parse(formObject(fd));
  const media = await readMediaFile(fd.get("media"));
  if (media && !media.ok) return { ok: false, fieldErrors: { media: media.error } };
  const e = await db.exercise.create({
    data: { ...d, ...(media ? { media: { create: { mime: media.mime, size: media.data.length, data: Buffer.from(media.data), uploadedBy: v.id } } } : {}) },
  });
  await audit(v.id, "exercise.create", "Exercise", e.id, null, { ...d, media: media ? media.mime : null });
  revalidatePath("/app/dryland");
  return { ok: true, message: "حرکت به کتابخانه اضافه شد." };
});

export const setExerciseMedia = guarded(STAFF, async (v, exerciseId: string, _p: unknown, fd: FormData) => {
  await db.exercise.findUniqueOrThrow({ where: { id: exerciseId } });
  if (fd.get("remove") === "1") {
    await db.exerciseMedia.deleteMany({ where: { exerciseId } });
    await audit(v.id, "exercise.media.remove", "Exercise", exerciseId);
    revalidatePath("/app/dryland");
    return { ok: true, message: "فایل حذف شد." };
  }
  const media = await readMediaFile(fd.get("media"));
  if (!media) return { ok: false, fieldErrors: { media: "فایلی انتخاب نشده است" } };
  if (!media.ok) return { ok: false, fieldErrors: { media: media.error } };
  const row = { mime: media.mime, size: media.data.length, data: Buffer.from(media.data), uploadedBy: v.id };
  await db.exerciseMedia.upsert({ where: { exerciseId }, create: { exerciseId, ...row }, update: row });
  await audit(v.id, "exercise.media.set", "Exercise", exerciseId, null, { mime: media.mime, size: media.data.length });
  revalidatePath("/app/dryland");
  return { ok: true, message: "فایل بارگذاری شد." };
});

const optNum = (label: string, min: number, max: number) =>
  z.preprocess((v) => (v === "" || v == null ? null : Number(String(v).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0)))),
    z.number({ invalid_type_error: `${label} باید عدد باشد` }).int(`${label} باید عدد صحیح باشد`).min(min, `${label} حداقل ${min}`).max(max, `${label} حداکثر ${max}`).nullable());

const itemSchema = z.object({
  id: z.string().optional(),
  exerciseId: z.string().min(1, "برای هر ردیف یک حرکت انتخاب کنید"),
  sets: optNum("ست", 1, 20).refine((x) => x !== null, "تعداد ست الزامی است"),
  reps: optNum("تکرار", 1, 200),
  durationSec: optNum("مدت", 1, 3600),
  restSec: optNum("استراحت", 0, 600),
  notes: z.string().trim().max(300).nullable().optional().transform((s) => s || null),
}).refine((x) => x.reps !== null || x.durationSec !== null, "برای هر حرکت تعداد تکرار یا مدت را وارد کنید");

const planSchema = z.object({
  title: z.string().trim().min(1, "عنوان الزامی است").max(120),
  target: z.string().regex(/^(group|athlete):.+$/, "گروه یا ورزشکار را انتخاب کنید"),
  date: jalaliDate(),
  notes: z.string().trim().max(1000).nullable().optional().transform((s) => s || null),
  items: z.array(itemSchema).min(1, "حداقل یک حرکت اضافه کنید").max(20),
});

/**
 * Creates or updates a dryland plan. Items that athletes have already logged are
 * kept (they can be edited but not removed) so their logs are never lost.
 */
export const saveDrylandPlan = guarded(STAFF, async (v, planId: string | null, input: unknown, publish: boolean) => {
  const d = planSchema.parse(input);
  const [kind, id] = d.target.split(":");
  const target = { groupId: kind === "group" ? id : null, athleteId: kind === "athlete" ? id : null };
  await assertCanAssign(v, target);
  const exIds = [...new Set(d.items.map((i) => i.exerciseId))];
  if ((await db.exercise.count({ where: { id: { in: exIds } } })) !== exIds.length) throw new ForbiddenError("حرکت نامعتبر");

  let prevStatus: string | null = null;
  if (planId) {
    const prev = await db.drylandPlan.findFirst({ where: { AND: [{ id: planId }, drylandPlanWhere(v)] }, include: { items: { include: { _count: { select: { logs: true } } } } } });
    if (!prev) throw new ForbiddenError();
    prevStatus = prev.status;
    const keep = new Set(d.items.map((i) => i.id).filter(Boolean));
    if (d.items.some((i) => i.id && !prev.items.some((x) => x.id === i.id))) throw new ForbiddenError("ردیف نامعتبر");
    const removedWithLogs = prev.items.filter((x) => !keep.has(x.id) && x._count.logs > 0);
    if (removedWithLogs.length) return { ok: false, message: "حرکت‌هایی که ورزشکاران برایشان گزارش ثبت کرده‌اند قابل حذف نیستند." };
    const lockedChanged = prev.items.filter((x) => x._count.logs > 0).some((x) => d.items.find((i) => i.id === x.id)?.exerciseId !== x.exerciseId);
    if (lockedChanged) return { ok: false, message: "حرکتِ ردیف‌های دارای گزارش قابل تعویض نیست." };
  }

  const status = publish ? "PUBLISHED" : prevStatus === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
  const base = { title: d.title, ...target, date: d.date, notes: d.notes, status } as const;
  const plan = await db.$transaction(async (tx) => {
    const p = planId ? await tx.drylandPlan.update({ where: { id: planId }, data: base }) : await tx.drylandPlan.create({ data: { ...base, authorId: v.id } });
    if (planId) await tx.drylandItem.deleteMany({ where: { planId, id: { notIn: d.items.map((i) => i.id).filter((x): x is string => !!x) } } });
    for (const [order, it] of d.items.entries()) {
      const data = { exerciseId: it.exerciseId, order, sets: it.sets!, reps: it.reps, durationSec: it.durationSec, restSec: it.restSec, notes: it.notes };
      if (it.id) await tx.drylandItem.update({ where: { id: it.id }, data });
      else await tx.drylandItem.create({ data: { ...data, planId: p.id } });
    }
    return p;
  });
  await audit(v.id, planId ? "dryland.update" : "dryland.create", "DrylandPlan", plan.id, prevStatus ? { status: prevStatus } : null, { status, items: d.items.length });
  if (publish) await publishNotify(plan, prevStatus === "PUBLISHED");
  revalidatePath("/app/dryland");
  revalidatePath(`/app/dryland/${plan.id}`);
  return { ok: true, message: publish ? "برنامه ذخیره و به ورزشکاران و خانواده‌ها اطلاع داده شد." : "پیش‌نویس ذخیره شد.", redirectTo: planId ? `/app/dryland/${plan.id}` : `/app/dryland/${plan.id}` };
});

async function publishNotify(plan: { id: string; title: string; groupId: string | null; athleteId: string | null }, updated = false) {
  const ids = plan.athleteId ? [plan.athleteId] : (await db.athlete.findMany({ where: { groupId: plan.groupId!, status: { in: ["ACTIVE", "TRIAL"] } }, select: { id: true } })).map((a) => a.id);
  await notify(await athleteAudience(ids), { type: "PLAN_PUBLISHED", title: updated ? "برنامه تمرین خشکی به‌روزرسانی شد" : "برنامه تمرین خشکی منتشر شد", body: plan.title, link: `/app/dryland/${plan.id}` });
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

