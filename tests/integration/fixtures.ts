import { db } from "@/server/db";
import type { Viewer } from "@/server/viewer";

/** Minimal synthetic fixture: two groups, two coaches, two athletes, guardians with verified / pending links. */
export async function buildFixture() {
  if (!process.env.DATABASE_URL?.includes("swim_test")) throw new Error("Integration tests must run against the swim_test database");
  const tables = await db.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations'`;
  await db.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(",")} RESTART IDENTITY CASCADE`);

  const u = (email: string, role: Viewer["role"]) => db.user.create({ data: { email, name: email, role, passwordHash: "x", isSample: true } });
  const [admin, coachA, coachB, nutri, nutri2, athUA, athUB, gVerified, gPending] = await Promise.all([
    u("admin@t", "ADMIN"), u("coachA@t", "COACH"), u("coachB@t", "COACH"), u("nutri@t", "NUTRITIONIST"), u("nutri2@t", "NUTRITIONIST"),
    u("athA@t", "ATHLETE"), u("athB@t", "ATHLETE"), u("gv@t", "GUARDIAN"), u("gp@t", "GUARDIAN"),
  ]);
  const groupA = await db.group.create({ data: { name: "A", coaches: { create: { userId: coachA.id } } } });
  const groupB = await db.group.create({ data: { name: "B", coaches: { create: { userId: coachB.id } } } });
  const base = { birthDate: new Date("2011-01-01"), enrolledAt: new Date("2025-01-01"), specialtyStrokes: ["FREESTYLE" as const] };
  const athleteA = await db.athlete.create({ data: { ...base, userId: athUA.id, groupId: groupA.id } });
  const athleteB = await db.athlete.create({ data: { ...base, userId: athUB.id, groupId: groupB.id } });
  await db.guardianLink.create({ data: { guardianId: gVerified.id, athleteId: athleteA.id, relation: "پدر", status: "VERIFIED" } });
  await db.guardianLink.create({ data: { guardianId: gPending.id, athleteId: athleteB.id, relation: "مادر", status: "PENDING" } });

  const resultB = await db.performanceResult.create({
    data: { athleteId: athleteB.id, stroke: "FREESTYLE", distance: 100, course: "SCM", timeMs: 61000, date: new Date("2026-10-01"), type: "OFFICIAL", recordedById: coachB.id },
  });
  const sessionB = await db.trainingSession.create({ data: { groupId: groupB.id, startsAt: new Date(), minutes: 120 } });
  const draftA = await db.workoutPlan.create({ data: { title: "draft", groupId: groupA.id, date: new Date(), status: "DRAFT", authorId: coachA.id } });
  const publishedA = await db.workoutPlan.create({ data: { title: "pub", groupId: groupA.id, date: new Date(), status: "PUBLISHED", authorId: coachA.id } });
  const nutritionReq = await db.nutritionRequest.create({ data: { athleteId: athleteA.id, submittedById: gVerified.id, assigneeId: nutri.id, topic: "t", question: "q" } });

  const v = (x: { id: string; role: Viewer["role"] }): Viewer => ({ id: x.id, role: x.role, name: "t" });
  return {
    viewers: { admin: v(admin), coachA: v(coachA), coachB: v(coachB), nutri: v(nutri), nutri2: v(nutri2), athA: v(athUA), athB: v(athUB), gVerified: v(gVerified), gPending: v(gPending) },
    athleteA, athleteB, resultB, sessionB, draftA, publishedA, nutritionReq, groupA, groupB,
  };
}
