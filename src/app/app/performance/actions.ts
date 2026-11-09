"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { guarded } from "@/server/action-guard";
import { audit } from "@/server/audit";
import { assertCanEditAthlete } from "@/server/authz";
import { athleteAudience, notify } from "@/server/notify";
import { STAFF } from "@/server/viewer";
import { formObject } from "@/lib/action";
import { checkbox, jalaliDate, opt, req } from "@/lib/zod-fa";
import { formatTime, isNewPersonalBest, parseTime } from "@/lib/domain/performance";
import { eventLabel } from "@/server/performance";

const time = (label: string) =>
  z.string().transform((s, ctx) => {
    const ms = parseTime(s);
    if (!ms) {
      ctx.addIssue({ code: "custom", message: `${label} نامعتبر است (مثال: 1:02.35 یا 28.91)` });
      return z.NEVER;
    }
    return ms;
  });

const event = {
  stroke: z.enum(["FREESTYLE", "BACKSTROKE", "BREASTSTROKE", "BUTTERFLY", "IM"]),
  distance: z.coerce.number().int().refine((d) => [25, 50, 100, 200, 400, 800, 1500].includes(d), "مسافت نامعتبر"),
  course: z.enum(["SCM", "LCM", "SCY"]),
};

export const addResult = guarded(STAFF, async (v, _p: unknown, fd: FormData) => {
  const d = z
    .object({
      athleteId: req("ورزشکار"),
      ...event,
      time: time("زمان"),
      date: jalaliDate(),
      venue: opt,
      type: z.enum(["OFFICIAL", "PRACTICE_TEST"]),
      isBaseline: checkbox,
      splits: z.string().optional().transform((s, ctx) => {
        if (!s?.trim()) return [];
        const parts = s.split(/[,،\s]+/).filter(Boolean).map(parseTime);
        if (parts.some((x) => !x)) {
          ctx.addIssue({ code: "custom", message: "زمان‌های میانی را با کاما جدا کنید (مثال: 29.80, 32.55)" });
          return z.NEVER;
        }
        return parts as number[];
      }),
      notes: opt,
    })
    .parse(formObject(fd));
  await assertCanEditAthlete(v, d.athleteId);
  if (d.splits.length && d.splits.reduce((a, b) => a + b, 0) > d.time + 50) {
    return { ok: false, fieldErrors: { splits: "مجموع زمان‌های میانی از زمان نهایی بیشتر است" } };
  }
  const history = await db.performanceResult.findMany({ where: { athleteId: d.athleteId } });
  const { time: timeMs, splits, ...rest } = d;
  const r = await db.performanceResult.create({ data: { ...rest, timeMs, splitsMs: splits, recordedById: v.id } });
  await audit(v.id, "result.create", "PerformanceResult", r.id, null, { ...rest, timeMs });
  const pb = isNewPersonalBest(r, history);
  if (pb) {
    await notify(await athleteAudience([d.athleteId]), { type: "NEW_RECORD", title: "🏅 رکورد شخصی جدید!", body: `${eventLabel(r)}: ${formatTime(timeMs)}`, link: "/app/performance" });
  }
  revalidatePath("/app/performance");
  return { ok: true, message: pb ? `ثبت شد — رکورد شخصی جدید (${formatTime(timeMs)})!` : "زمان ثبت شد." };
});

export const deleteResult = guarded(STAFF, async (v, id: string) => {
  const r = await db.performanceResult.findUniqueOrThrow({ where: { id } });
  await assertCanEditAthlete(v, r.athleteId);
  await db.performanceResult.delete({ where: { id } });
  await audit(v.id, "result.delete", "PerformanceResult", id, r, null);
  revalidatePath("/app/performance");
  return { ok: true };
});

export const setTarget = guarded(STAFF, async (v, _p: unknown, fd: FormData) => {
  const d = z.object({ athleteId: req("ورزشکار"), ...event, time: time("زمان هدف") }).parse(formObject(fd));
  await assertCanEditAthlete(v, d.athleteId);
  const season = await db.season.findFirst({ where: { active: true } });
  if (!season) return { ok: false, message: "فصل فعالی تعریف نشده است." };
  const key = { seasonId: season.id, athleteId: d.athleteId, stroke: d.stroke, distance: d.distance, course: d.course };
  await db.seasonTarget.upsert({ where: { seasonId_athleteId_stroke_distance_course: key }, create: { ...key, timeMs: d.time }, update: { timeMs: d.time } });
  await audit(v.id, "target.set", "SeasonTarget", d.athleteId, null, { ...key, timeMs: d.time });
  revalidatePath("/app/performance");
  return { ok: true, message: "هدف فصل ذخیره شد." };
});
