"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { guarded } from "@/server/action-guard";
import { audit } from "@/server/audit";
import { canViewAthlete, nutritionRequestWhere } from "@/server/authz";
import { athleteAudience, notify } from "@/server/notify";
import { ForbiddenError } from "@/server/viewer";
import { formObject } from "@/lib/action";
import { checkbox, opt, req } from "@/lib/zod-fa";
import { ageOn } from "@/lib/domain/jalali";

export const submitNutritionRequest = guarded(["ATHLETE", "GUARDIAN"], async (v, _p: unknown, fd: FormData) => {
  const d = z.object({
    athleteId: req("ورزشکار"), topic: req("موضوع").pipe(z.string().max(120)), question: req("سؤال").pipe(z.string().max(2000)),
    allergies: opt.pipe(z.string().max(300).nullable()), consent: checkbox,
  }).parse(formObject(fd));
  if (!(await canViewAthlete(v, d.athleteId))) throw new ForbiddenError();
  const athlete = await db.athlete.findUniqueOrThrow({ where: { id: d.athleteId } });
  // Sensitive data (allergies) only with consent: a guardian, or the athlete if 18+.
  const mayConsent = v.role === "GUARDIAN" || ageOn(athlete.birthDate) >= 18;
  if (d.allergies && !(d.consent && mayConsent)) {
    return { ok: false, fieldErrors: { allergies: v.role === "ATHLETE" ? "اطلاعات حساسیت غذایی را باید سرپرست شما با رضایت ثبت کند." : "برای ثبت حساسیت غذایی، رضایت را تأیید کنید." } };
  }
  const r = await db.nutritionRequest.create({
    data: { athleteId: d.athleteId, submittedById: v.id, topic: d.topic, question: d.question, allergies: d.allergies, guardianConsent: !!(d.allergies && d.consent && mayConsent) },
  });
  const admins = await db.user.findMany({ where: { role: "ADMIN", active: true }, select: { id: true } });
  await notify(admins.map((a) => a.id), { type: "NUTRITION", title: "درخواست مشاوره تغذیه جدید", body: "برای ارجاع به متخصص", link: `/app/nutrition` });
  revalidatePath("/app/nutrition");
  return { ok: true, message: "درخواست ثبت شد. پس از ارجاع، متخصص تغذیه پاسخ می‌دهد.", redirectTo: `/app/nutrition/${r.id}` };
});

export const assignNutrition = guarded(["ADMIN"], async (v, requestId: string, _p: unknown, fd: FormData) => {
  const { assigneeId } = z.object({ assigneeId: req("متخصص") }).parse(formObject(fd));
  if (!(await db.user.count({ where: { id: assigneeId, role: "NUTRITIONIST", active: true } }))) throw new ForbiddenError("کاربر متخصص تغذیه نیست");
  await db.nutritionRequest.update({ where: { id: requestId }, data: { assigneeId, status: "IN_PROGRESS" } });
  await audit(v.id, "nutrition.assign", "NutritionRequest", requestId, null, { assigneeId });
  await notify([assigneeId], { type: "NUTRITION", title: "درخواست مشاوره به شما ارجاع شد", link: `/app/nutrition/${requestId}` });
  revalidatePath("/app/nutrition");
  return { ok: true, message: "ارجاع شد." };
});

export const replyNutrition = guarded(["NUTRITIONIST", "ATHLETE", "GUARDIAN"], async (v, requestId: string, _p: unknown, fd: FormData) => {
  const req0 = await db.nutritionRequest.findFirst({ where: { AND: [{ id: requestId }, nutritionRequestWhere(v)] } });
  if (!req0) throw new ForbiddenError();
  const { body } = z.object({ body: req("متن پاسخ").pipe(z.string().max(4000)) }).parse(formObject(fd));
  await db.nutritionReply.create({ data: { requestId, authorId: v.id, body } });
  if (v.role === "NUTRITIONIST") {
    await db.nutritionRequest.update({ where: { id: requestId }, data: { status: "ANSWERED" } });
    await notify(await athleteAudience([req0.athleteId]), { type: "REPLY", title: "متخصص تغذیه پاسخ داد", link: `/app/nutrition/${requestId}` });
  } else if (req0.assigneeId) {
    await notify([req0.assigneeId], { type: "REPLY", title: "پیام جدید در درخواست تغذیه", link: `/app/nutrition/${requestId}` });
  }
  revalidatePath(`/app/nutrition/${requestId}`);
  return { ok: true, message: "ارسال شد." };
});

export const publishArticle = guarded(["NUTRITIONIST", "ADMIN"], async (v, _p: unknown, fd: FormData) => {
  const d = z.object({ title: req("عنوان"), summary: req("خلاصه"), body: req("متن") }).parse(formObject(fd));
  const a = await db.nutritionArticle.create({ data: d });
  await audit(v.id, "nutrition.article", "NutritionArticle", a.id, null, { title: d.title });
  revalidatePath("/app/nutrition");
  return { ok: true, message: "مطلب آموزشی منتشر شد." };
});
