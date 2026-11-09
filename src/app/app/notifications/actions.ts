"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { guarded } from "@/server/action-guard";

export const markAllRead = guarded(null, async (v) => {
  await db.notification.updateMany({ where: { userId: v.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/app", "layout");
  return { ok: true };
});

export const markRead = guarded(null, async (v, id: string) => {
  // Scoped by userId: a user can never change another user's notification.
  await db.notification.updateMany({ where: { id, userId: v.id }, data: { readAt: new Date() } });
  revalidatePath("/app", "layout");
  return { ok: true };
});
