"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { guarded } from "@/server/action-guard";
import { audit } from "@/server/audit";
import { notify } from "@/server/notify";
import { formObject } from "@/lib/action";
import { jalaliDate, req } from "@/lib/zod-fa";

/**
 * A guardian asks to be linked to an athlete. The response is identical whether
 * or not a match exists, so this cannot be used to discover athletes.
 * Access is granted only after an admin / head coach verifies the link.
 */
export const requestLink = guarded(["GUARDIAN"], async (v, _p: unknown, fd: FormData) => {
  const d = z.object({ athleteName: req("نام ورزشکار"), birthDate: jalaliDate("تاریخ تولد"), relation: req("نسبت") }).parse(formObject(fd));
  const match = await db.athlete.findFirst({ where: { birthDate: d.birthDate, user: { name: { equals: d.athleteName.trim(), mode: "insensitive" } } } });
  if (match) {
    const exists = await db.guardianLink.findUnique({ where: { guardianId_athleteId: { guardianId: v.id, athleteId: match.id } } });
    if (!exists) {
      const link = await db.guardianLink.create({ data: { guardianId: v.id, athleteId: match.id, relation: d.relation } });
      await audit(v.id, "guardian.request", "GuardianLink", link.id, null, { athleteId: match.id });
      const verifiers = await db.user.findMany({ where: { role: { in: ["ADMIN", "HEAD_COACH"] }, active: true }, select: { id: true } });
      await notify(verifiers.map((u) => u.id), { type: "SYSTEM", title: "درخواست تأیید سرپرست", link: "/app/admin/guardians" });
    }
  }
  revalidatePath("/app/family");
  return { ok: true, message: "درخواست ثبت شد. در صورت تطابق اطلاعات، پس از تأیید آکادمی دسترسی فعال می‌شود." };
});
