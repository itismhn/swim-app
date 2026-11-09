import { db } from "./db";

export interface NotificationInput {
  type: "PLAN_PUBLISHED" | "SCHEDULE_CHANGED" | "NEW_RECORD" | "REPLY" | "MESSAGE" | "PAIN_FLAG" | "NUTRITION" | "SYSTEM";
  title: string;
  body?: string;
  link?: string;
}

/** In-app notifications. External delivery (SMS/email) is NOT configured — see notify-external.ts. */
export async function notify(userIds: string[], n: NotificationInput) {
  const unique = [...new Set(userIds)].filter(Boolean);
  if (!unique.length) return;
  await db.notification.createMany({ data: unique.map((userId) => ({ userId, ...n })) });
}

/** User ids of an athlete and their verified guardians. */
export async function athleteAudience(athleteIds: string[]): Promise<string[]> {
  if (!athleteIds.length) return [];
  const rows = await db.athlete.findMany({
    where: { id: { in: athleteIds } },
    select: { userId: true, guardianLinks: { where: { status: "VERIFIED" }, select: { guardianId: true } } },
  });
  return rows.flatMap((r) => [r.userId, ...r.guardianLinks.map((g) => g.guardianId)]);
}

/** Coaches of the athlete's group plus head coaches. */
export async function coachesOfAthlete(athleteId: string): Promise<string[]> {
  const a = await db.athlete.findUnique({
    where: { id: athleteId },
    select: { group: { select: { coaches: { select: { userId: true } } } } },
  });
  const heads = await db.user.findMany({ where: { role: "HEAD_COACH", active: true }, select: { id: true } });
  return [...(a?.group?.coaches.map((c) => c.userId) ?? []), ...heads.map((h) => h.id)];
}
