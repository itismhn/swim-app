"use server";
import { z } from "zod";
import { headers } from "next/headers";
import { db } from "@/server/db";
import { clientIp, rateLimit } from "@/server/rate-limit";
import { fromZod, formObject, type ActionResult } from "@/lib/action";
import { checkbox, int, opt, phone, req } from "@/lib/zod-fa";

const schema = z.object({
  kind: z.enum(["REGISTRATION", "CONSULTATION"]),
  guardianName: req("نام سرپرست").pipe(z.string().max(100)),
  phone,
  email: z.string().trim().email("ایمیل معتبر نیست").optional().or(z.literal("")).transform((s) => s || null),
  swimmerAge: int("سن شناگر", 6, 25),
  experience: opt,
  message: opt.pipe(z.string().max(1000).nullable()),
  consent: checkbox.refine((v) => v, "برای ثبت درخواست، رضایت لازم است"),
  website: z.string().max(0).optional(), // honeypot
});

export async function submitInquiry(_: ActionResult, fd: FormData): Promise<ActionResult> {
  if (!rateLimit(`inquiry:${clientIp(await headers())}`, 5, 60 * 60 * 1000).ok) {
    return { ok: false, message: "تعداد درخواست‌ها از این دستگاه زیاد است. لطفاً بعداً تلاش کنید یا تماس بگیرید." };
  }
  const parsed = schema.safeParse(formObject(fd));
  if (!parsed.success) return fromZod(parsed.error);
  const { website: _hp, ...data } = parsed.data;
  await db.inquiryRequest.create({ data });
  return { ok: true, message: "درخواست شما ثبت شد. همکاران ما برای هماهنگی تماس می‌گیرند." };
}
