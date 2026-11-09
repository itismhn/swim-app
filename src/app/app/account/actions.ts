"use server";
import { z } from "zod";
import { db } from "@/server/db";
import { guarded } from "@/server/action-guard";
import { audit } from "@/server/audit";
import { currentSessionHash } from "@/server/auth";
import { hashPassword, verifyPassword } from "@/server/password";
import { rateLimit } from "@/server/rate-limit";
import { formObject } from "@/lib/action";

const schema = z
  .object({
    current: z.string().min(1, "رمز فعلی را وارد کنید"),
    next: z.string().min(10, "رمز جدید حداقل ۱۰ کاراکتر").max(200),
    confirm: z.string(),
  })
  .refine((d) => d.next === d.confirm, { path: ["confirm"], message: "تکرار رمز با رمز جدید یکسان نیست" })
  .refine((d) => d.next !== d.current, { path: ["next"], message: "رمز جدید باید با رمز فعلی متفاوت باشد" });

/** Changes the viewer's own password and signs out every other session. */
export const changePassword = guarded(null, async (v, _p: unknown, fd: FormData) => {
  const d = schema.parse(formObject(fd));
  if (!rateLimit(`pwchange:${v.id}`, 5, 15 * 60_000).ok) return { ok: false, message: "تلاش‌های زیاد. بعداً دوباره امتحان کنید." };
  const user = await db.user.findUniqueOrThrow({ where: { id: v.id } });
  if (!(await verifyPassword(d.current, user.passwordHash))) return { ok: false, fieldErrors: { current: "رمز فعلی نادرست است" } };
  await db.user.update({ where: { id: v.id }, data: { passwordHash: await hashPassword(d.next) } });
  const keep = await currentSessionHash();
  const { count } = await db.session.deleteMany({ where: { userId: v.id, ...(keep ? { tokenHash: { not: keep } } : {}) } });
  await audit(v.id, "user.password.change", "User", v.id, null, { otherSessionsRevoked: count });
  return { ok: true, message: count ? `رمز تغییر کرد و ${count.toLocaleString("fa-IR")} نشست دیگر خارج شد.` : "رمز عبور تغییر کرد." };
});

/** Signs out all other devices without changing the password. */
export const signOutOthers = guarded(null, async (v) => {
  const keep = await currentSessionHash();
  const { count } = await db.session.deleteMany({ where: { userId: v.id, ...(keep ? { tokenHash: { not: keep } } : {}) } });
  await audit(v.id, "user.sessions.revoke", "User", v.id, null, { count });
  return { ok: true, message: `${count.toLocaleString("fa-IR")} نشست دیگر خارج شد.` };
});
