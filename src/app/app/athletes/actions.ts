"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { guarded } from "@/server/action-guard";
import { audit } from "@/server/audit";
import { assertCanEditAthlete, canEditMedical, canManageGroup } from "@/server/authz";
import { hashPassword } from "@/server/password";
import { ForbiddenError, isAcademyWide, STAFF } from "@/server/viewer";
import { formObject } from "@/lib/action";
import { checkbox, jalaliDate, opt, req } from "@/lib/zod-fa";

const strokes = z.preprocess(
  (v) => (v == null ? [] : Array.isArray(v) ? v : [v]),
  z.array(z.enum(["FREESTYLE", "BACKSTROKE", "BREASTSTROKE", "BUTTERFLY", "IM"])),
);

const profile = z.object({
  name: req("نام").pipe(z.string().max(100)),
  birthDate: jalaliDate("تاریخ تولد"),
  enrolledAt: jalaliDate("تاریخ عضویت"),
  groupId: z.string().optional().transform((s) => s || null),
  status: z.enum(["ACTIVE", "PAUSED", "TRIAL", "LEFT"]),
  specialtyStrokes: strokes,
  secondaryStrokes: strokes,
  trainingGoals: opt,
  seasonGoals: opt,
  emergencyName: opt,
  emergencyPhone: opt,
});

async function assertGroupAllowed(v: Parameters<typeof canManageGroup>[0], groupId: string | null) {
  if (groupId && !(await canManageGroup(v, groupId))) throw new ForbiddenError("این گروه در دسترس شما نیست");
  if (!groupId && !isAcademyWide(v)) throw new ForbiddenError("مربی گروه باید یکی از گروه‌های خود را انتخاب کند");
}

export const createAthlete = guarded(STAFF, async (v, _prev: unknown, fd: FormData) => {
  const data = profile
    .extend({
      email: z.string().trim().toLowerCase().email("ایمیل معتبر نیست"),
      password: z.string().min(10, "رمز عبور اولیه حداقل ۱۰ کاراکتر"),
    })
    .parse(formObject(fd));
  await assertGroupAllowed(v, data.groupId);
  if (await db.user.findUnique({ where: { email: data.email } })) return { ok: false, fieldErrors: { email: "این ایمیل قبلاً ثبت شده است" } };
  const { name, email, password, ...rest } = data;
  const user = await db.user.create({ data: { name, email, role: "ATHLETE", passwordHash: await hashPassword(password) } });
  const a = await db.athlete.create({ data: { ...rest, userId: user.id } });
  await audit(v.id, "athlete.create", "Athlete", a.id, null, { name, groupId: rest.groupId });
  revalidatePath("/app/athletes");
  return { ok: true, message: "ورزشکار ثبت شد.", redirectTo: `/app/athletes/${a.id}` };
});

export const updateAthlete = guarded(STAFF, async (v, athleteId: string, _prev: unknown, fd: FormData) => {
  await assertCanEditAthlete(v, athleteId);
  const data = profile.parse(formObject(fd));
  const before = await db.athlete.findUniqueOrThrow({ where: { id: athleteId }, include: { user: { select: { name: true } } } });
  if (data.groupId !== before.groupId) await assertGroupAllowed(v, data.groupId);
  const { name, ...rest } = data;
  await db.$transaction([
    db.athlete.update({ where: { id: athleteId }, data: rest }),
    db.user.update({ where: { id: before.userId }, data: { name } }),
  ]);
  const { user, createdAt, updatedAt, ...beforeData } = before;
  await audit(v.id, "athlete.update", "Athlete", athleteId, { ...beforeData, name: user.name }, data);
  revalidatePath(`/app/athletes/${athleteId}`);
  return { ok: true, message: "تغییرات ذخیره شد." };
});

export const addCoachNote = guarded(STAFF, async (v, athleteId: string, _prev: unknown, fd: FormData) => {
  await assertCanEditAthlete(v, athleteId);
  const d = z.object({ body: req("متن یادداشت").pipe(z.string().max(2000)), visibility: z.enum(["STAFF_ONLY", "SHARED"]) }).parse(formObject(fd));
  await db.coachNote.create({ data: { ...d, athleteId, authorId: v.id } });
  revalidatePath(`/app/athletes/${athleteId}`);
  return { ok: true, message: "یادداشت ثبت شد." };
});

export const saveMedical = guarded(null, async (v, athleteId: string, _prev: unknown, fd: FormData) => {
  if (!(await canEditMedical(v, athleteId))) throw new ForbiddenError();
  const d = z
    .object({
      trainingRestrictions: opt.pipe(z.string().max(1000).nullable()),
      allergies: opt.pipe(z.string().max(500).nullable()),
      consent: checkbox.refine((x) => x, "ثبت این اطلاعات فقط با رضایت سرپرست ممکن است"),
    })
    .parse(formObject(fd));
  const before = await db.athleteMedical.findUnique({ where: { athleteId } });
  if (v.role !== "GUARDIAN" && !before) {
    throw new ForbiddenError("اولین ثبت اطلاعات پزشکی باید با رضایت سرپرست تأییدشده انجام شود");
  }
  const data = { trainingRestrictions: d.trainingRestrictions, allergies: d.allergies };
  const consent = v.role === "GUARDIAN" ? { guardianConsentAt: new Date(), consentByUserId: v.id } : {};
  await db.athleteMedical.upsert({
    where: { athleteId },
    create: { athleteId, ...data, guardianConsentAt: new Date(), consentByUserId: v.id },
    update: { ...data, ...consent },
  });
  // Values are not copied into the audit trail to avoid duplicating sensitive data.
  await audit(v.id, "medical.update", "AthleteMedical", athleteId, { existed: !!before }, { fields: Object.keys(data) });
  revalidatePath(`/app/athletes/${athleteId}`);
  return { ok: true, message: "اطلاعات محرمانه ذخیره شد." };
});
