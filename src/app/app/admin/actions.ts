"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { guarded } from "@/server/action-guard";
import { audit } from "@/server/audit";
import { notify } from "@/server/notify";
import { hashPassword } from "@/server/password";
import { ForbiddenError } from "@/server/viewer";
import { formObject } from "@/lib/action";
import { checkbox, int, jalaliDate, opt, req } from "@/lib/zod-fa";

const ROLES = ["ADMIN", "HEAD_COACH", "COACH", "NUTRITIONIST", "ATHLETE", "GUARDIAN"] as const;

// ── Guardian verification (admin + head coach) ──
export const decideLink = guarded(["ADMIN", "HEAD_COACH"], async (v, linkId: string, decision: "VERIFIED" | "REJECTED") => {
  if (!["VERIFIED", "REJECTED"].includes(decision)) throw new ForbiddenError();
  const before = await db.guardianLink.findUniqueOrThrow({ where: { id: linkId } });
  await db.guardianLink.update({ where: { id: linkId }, data: { status: decision, verifiedById: v.id, verifiedAt: new Date() } });
  await audit(v.id, `guardian.${decision.toLowerCase()}`, "GuardianLink", linkId, { status: before.status }, { status: decision });
  await notify([before.guardianId], { type: "SYSTEM", title: decision === "VERIFIED" ? "رابطه سرپرستی شما تأیید شد" : "درخواست اتصال سرپرستی تأیید نشد", link: "/app/family" });
  revalidatePath("/app/admin/guardians");
  return { ok: true };
});

export const createLink = guarded(["ADMIN", "HEAD_COACH"], async (v, _p: unknown, fd: FormData) => {
  const d = z.object({ guardianId: req("سرپرست"), athleteId: req("ورزشکار"), relation: req("نسبت") }).parse(formObject(fd));
  const g = await db.user.findFirst({ where: { id: d.guardianId, role: "GUARDIAN" } });
  if (!g) throw new ForbiddenError("کاربر انتخاب‌شده سرپرست نیست");
  const link = await db.guardianLink.upsert({
    where: { guardianId_athleteId: { guardianId: d.guardianId, athleteId: d.athleteId } },
    create: { ...d, status: "VERIFIED", verifiedById: v.id, verifiedAt: new Date() },
    update: { relation: d.relation, status: "VERIFIED", verifiedById: v.id, verifiedAt: new Date() },
  });
  await audit(v.id, "guardian.link", "GuardianLink", link.id, null, d);
  revalidatePath("/app/admin/guardians");
  return { ok: true, message: "اتصال ثبت و تأیید شد." };
});

// ── Users ──
export const createUser = guarded(["ADMIN"], async (v, _p: unknown, fd: FormData) => {
  const d = z.object({
    name: req("نام"), email: z.string().trim().toLowerCase().email("ایمیل معتبر نیست"), phone: opt, role: z.enum(ROLES),
    password: z.string().min(10, "رمز عبور حداقل ۱۰ کاراکتر"),
  }).parse(formObject(fd));
  if (d.role === "ATHLETE") return { ok: false, message: "ورزشکاران را از بخش «ورزشکاران» ثبت کنید تا پروفایل کامل ساخته شود." };
  if (await db.user.findUnique({ where: { email: d.email } })) return { ok: false, fieldErrors: { email: "این ایمیل قبلاً ثبت شده است" } };
  const { password, ...rest } = d;
  const u = await db.user.create({ data: { ...rest, passwordHash: await hashPassword(password) } });
  await audit(v.id, "user.create", "User", u.id, null, rest);
  revalidatePath("/app/admin/users");
  return { ok: true, message: "کاربر ساخته شد." };
});

export const updateUser = guarded(["ADMIN"], async (v, userId: string, _p: unknown, fd: FormData) => {
  const d = z.object({ role: z.enum(ROLES), active: checkbox, password: z.string().optional().transform((s) => s || null) }).parse(formObject(fd));
  if (d.password && d.password.length < 10) return { ok: false, fieldErrors: { password: "رمز عبور حداقل ۱۰ کاراکتر" } };
  const before = await db.user.findUniqueOrThrow({ where: { id: userId }, include: { athlete: true } });
  if (userId === v.id && (!d.active || d.role !== "ADMIN")) return { ok: false, message: "نمی‌توانید نقش یا وضعیت حساب خودتان را تغییر دهید." };
  if (before.athlete && d.role !== "ATHLETE") return { ok: false, message: "نقش حساب ورزشکار قابل تغییر نیست." };
  await db.user.update({ where: { id: userId }, data: { role: d.role, active: d.active, ...(d.password ? { passwordHash: await hashPassword(d.password) } : {}) } });
  if (!d.active || d.password || d.role !== before.role) await db.session.deleteMany({ where: { userId } }); // force re-login
  await audit(v.id, "user.update", "User", userId, { role: before.role, active: before.active }, { role: d.role, active: d.active, passwordReset: !!d.password });
  revalidatePath("/app/admin/users");
  return { ok: true, message: "ذخیره شد." };
});

// ── Settings ──
export const saveSettings = guarded(["ADMIN"], async (v, _p: unknown, fd: FormData) => {
  const d = z.object({
    academyName: req("نام آکادمی"),
    poolLengthMeters: int("طول استخر", 25, 50).refine((x) => x === 25 || x === 50, "۲۵ یا ۵۰ متر"),
    sessionsPerWeek: int("جلسات هفتگی", 1, 14),
    sessionMinutes: int("مدت جلسه", 30, 300),
    guardianOversightMinors: checkbox,
    countExcusedAsAbsent: checkbox,
    contactPhone: opt, contactEmail: opt, contactAddress: opt,
  }).parse(formObject(fd));
  const before = await db.academySetting.findUnique({ where: { id: 1 } });
  await db.academySetting.upsert({ where: { id: 1 }, create: { id: 1, ...d }, update: d });
  await audit(v.id, "settings.update", "AcademySetting", "1", before, d);
  revalidatePath("/", "layout");
  return { ok: true, message: "تنظیمات ذخیره شد." };
});

// ── Seasons, milestones, competitions ──
export const createSeason = guarded(["ADMIN"], async (v, _p: unknown, fd: FormData) => {
  const d = z.object({ name: req("نام فصل"), startDate: jalaliDate("شروع"), endDate: jalaliDate("پایان"), goals: opt }).parse(formObject(fd));
  if (d.endDate <= d.startDate) return { ok: false, fieldErrors: { endDate: "پایان باید بعد از شروع باشد" } };
  const s = await db.season.create({
    data: { ...d, milestones: { create: [{ week: 8, title: "ارزیابی هفته ۸" }, { week: 16, title: "ارزیابی هفته ۱۶" }] } },
  });
  await audit(v.id, "season.create", "Season", s.id, null, d);
  revalidatePath("/app/admin/seasons");
  return { ok: true, message: "فصل ساخته شد (با نقاط عطف نمونه هفته ۸ و ۱۶)." };
});

export const activateSeason = guarded(["ADMIN"], async (v, seasonId: string) => {
  await db.$transaction([db.season.updateMany({ data: { active: false } }), db.season.update({ where: { id: seasonId }, data: { active: true } })]);
  await audit(v.id, "season.activate", "Season", seasonId);
  revalidatePath("/app/admin/seasons");
  return { ok: true };
});

export const saveMilestone = guarded(["ADMIN", "HEAD_COACH"], async (v, seasonId: string, milestoneId: string | null, _p: unknown, fd: FormData) => {
  const d = z.object({ week: int("هفته", 1, 60), title: req("عنوان"), description: opt }).parse(formObject(fd));
  const m = milestoneId
    ? await db.milestone.update({ where: { id: milestoneId, seasonId }, data: d })
    : await db.milestone.create({ data: { ...d, seasonId } });
  await audit(v.id, "milestone.save", "Milestone", m.id, null, d);
  revalidatePath("/app/admin/seasons");
  return { ok: true, message: "ذخیره شد." };
});

export const addCompetition = guarded(["ADMIN", "HEAD_COACH"], async (v, seasonId: string, _p: unknown, fd: FormData) => {
  const d = z.object({ name: req("نام مسابقه"), date: jalaliDate(), venue: opt, course: z.enum(["SCM", "LCM", "SCY"]), isTarget: checkbox }).parse(formObject(fd));
  const c = await db.competition.create({ data: { ...d, seasonId } });
  await audit(v.id, "competition.create", "Competition", c.id, null, d);
  revalidatePath("/app/admin/seasons");
  return { ok: true, message: "مسابقه اضافه شد." };
});

// ── Inquiries ──
export const setInquiryStatus = guarded(["ADMIN", "HEAD_COACH"], async (v, id: string, status: "OPEN" | "IN_PROGRESS" | "ANSWERED" | "CLOSED") => {
  z.enum(["OPEN", "IN_PROGRESS", "ANSWERED", "CLOSED"]).parse(status);
  await db.inquiryRequest.update({ where: { id }, data: { status } });
  await audit(v.id, "inquiry.status", "InquiryRequest", id, null, { status });
  revalidatePath("/app/admin/inquiries");
  return { ok: true };
});

// ── Public content ──
export const addPublicItem = guarded(["ADMIN"], async (v, kind: "faq" | "program" | "coach", _p: unknown, fd: FormData) => {
  const o = formObject(fd);
  if (kind === "faq") await db.faq.create({ data: z.object({ question: req("سؤال"), answer: req("پاسخ"), order: int("ترتیب", 0, 99).default(0) }).parse(o) });
  else if (kind === "program") await db.program.create({ data: z.object({ title: req("عنوان"), description: req("توضیح"), order: int("ترتیب", 0, 99).default(0) }).parse(o) });
  else await db.publicCoachProfile.create({ data: z.object({ name: req("نام"), title: req("عنوان"), bio: req("معرفی"), order: int("ترتیب", 0, 99).default(0) }).parse(o) });
  await audit(v.id, `public.${kind}.create`, "PublicContent", null, null, o);
  revalidatePath("/", "layout");
  return { ok: true, message: "اضافه شد." };
});

export const deletePublicItem = guarded(["ADMIN"], async (v, kind: "faq" | "program" | "coach", id: string) => {
  if (kind === "faq") await db.faq.delete({ where: { id } });
  else if (kind === "program") await db.program.delete({ where: { id } });
  else if (kind === "coach") await db.publicCoachProfile.delete({ where: { id } });
  await audit(v.id, `public.${kind}.delete`, "PublicContent", id);
  revalidatePath("/", "layout");
  return { ok: true };
});
