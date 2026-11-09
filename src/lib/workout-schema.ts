import { z } from "zod";

export const STROKES = ["FREESTYLE", "BACKSTROKE", "BREASTSTROKE", "BUTTERFLY", "IM", "CHOICE"] as const;
export const INTENSITIES = ["EASY", "AEROBIC", "THRESHOLD", "VO2", "SPRINT", "RECOVERY", "TECHNIQUE"] as const;
export const SECTIONS = ["WARMUP", "TECHNIQUE", "KICK_PULL", "MAIN", "SKILLS", "COOLDOWN"] as const;

const n = (label: string, min: number, max: number) =>
  z.coerce.number({ invalid_type_error: `${label} باید عدد باشد` }).int(`${label} باید عدد صحیح باشد`).min(min, `${label} حداقل ${min}`).max(max, `${label} حداکثر ${max}`);
const optN = (max: number) => z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().int().min(0).max(max).nullable());
const optS = (max: number) => z.string().trim().max(max).optional().nullable().transform((s) => s || null);

export const segmentSchema = z.object({ meters: n("متراژ", 1, 5000), description: optS(120) });
export const setSchema = z.object({
  rounds: n("تعداد دور", 1, 20),
  reps: n("تعداد تکرار", 1, 100),
  stroke: z.enum(STROKES),
  intensity: z.enum(INTENSITIES),
  restSec: optN(900),
  sendOffSec: optN(900),
  focus: optS(200),
  notes: optS(500),
  equipment: z.array(z.string()).max(10).default([]),
  segments: z.array(segmentSchema).min(1, "هر ست حداقل یک بخش متراژ دارد").max(5),
});
export const sectionSchema = z.object({ kind: z.enum(SECTIONS), title: optS(80), sets: z.array(setSchema).max(20) });
export const planSchema = z.object({
  title: z.string().trim().min(1, "عنوان الزامی است").max(120),
  target: z.string().regex(/^(group|athlete):.+$/, "گروه یا ورزشکار را انتخاب کنید"),
  date: z.string().min(1, "تاریخ الزامی است"),
  poolLength: z.coerce.number().int().refine((x) => [25, 50].includes(x), "طول استخر ۲۵ یا ۵۰ متر"),
  notes: optS(1000),
  sections: z.array(sectionSchema).min(1).max(10),
});
export type PlanInput = z.input<typeof planSchema>;
export type PlanData = z.output<typeof planSchema>;
