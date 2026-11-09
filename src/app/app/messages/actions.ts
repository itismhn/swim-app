"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { guarded } from "@/server/action-guard";
import { messageableUsers, threadWhere } from "@/server/authz";
import { notify } from "@/server/notify";
import { ForbiddenError } from "@/server/viewer";
import { formObject } from "@/lib/action";
import { req } from "@/lib/zod-fa";
import { ageOn } from "@/lib/domain/jalali";

/**
 * Starts a thread. If the thread concerns an athlete under 18 and guardian
 * oversight is on, the athlete's verified guardians are added automatically.
 */
export const startThread = guarded(null, async (v, _p: unknown, fd: FormData) => {
  const d = z.object({ to: req("گیرنده"), subject: req("موضوع").pipe(z.string().max(120)), body: req("متن پیام").pipe(z.string().max(4000)) }).parse(formObject(fd));
  const [userId, athleteId] = d.to.split("|");
  const allowed = (await messageableUsers(v)).find((m) => m.userId === userId && m.athleteId === athleteId);
  if (!allowed) throw new ForbiddenError("ارسال پیام به این کاربر مجاز نیست");

  const settings = await db.academySetting.findUnique({ where: { id: 1 } });
  const athlete = await db.athlete.findUniqueOrThrow({ where: { id: athleteId }, include: { guardianLinks: { where: { status: "VERIFIED" } } } });
  const participants = new Map<string, boolean>([[v.id, false], [userId, false]]);
  if (settings?.guardianOversightMinors !== false && ageOn(athlete.birthDate) < 18 && (participants.has(athlete.userId))) {
    for (const g of athlete.guardianLinks) if (!participants.has(g.guardianId)) participants.set(g.guardianId, true);
  }
  const t = await db.thread.create({
    data: {
      subject: d.subject, athleteId,
      participants: { create: [...participants].map(([uid, oversight]) => ({ userId: uid, oversight, lastReadAt: uid === v.id ? new Date() : null })) },
      messages: { create: { authorId: v.id, body: d.body } },
    },
  });
  await notify([...participants.keys()].filter((x) => x !== v.id), { type: "MESSAGE", title: `پیام جدید از ${v.name}`, body: d.subject, link: `/app/messages/${t.id}` });
  revalidatePath("/app/messages");
  return { ok: true, redirectTo: `/app/messages/${t.id}` };
});

export const sendMessage = guarded(null, async (v, threadId: string, _p: unknown, fd: FormData) => {
  const t = await db.thread.findFirst({ where: { AND: [{ id: threadId }, threadWhere(v)] }, include: { participants: true } });
  if (!t) throw new ForbiddenError();
  const { body } = z.object({ body: req("متن پیام").pipe(z.string().max(4000)) }).parse(formObject(fd));
  await db.message.create({ data: { threadId, authorId: v.id, body } });
  await db.thread.update({ where: { id: threadId }, data: { updatedAt: new Date() } });
  await db.threadParticipant.update({ where: { threadId_userId: { threadId, userId: v.id } }, data: { lastReadAt: new Date() } });
  await notify(t.participants.map((p) => p.userId).filter((x) => x !== v.id), { type: "MESSAGE", title: `پاسخ جدید از ${v.name}`, body: t.subject, link: `/app/messages/${threadId}` });
  revalidatePath(`/app/messages/${threadId}`);
  return { ok: true };
});
