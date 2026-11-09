/**
 * Deletes every SYNTHETIC record created by the seed (users flagged isSample and
 * everything that cascades from them), plus sample-only reference content.
 * Real accounts and their data are left untouched.
 *
 *   npm run remove-sample-data -- --yes
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  if (!process.argv.includes("--yes")) throw new Error("This deletes all sample data. Re-run with --yes to confirm.");
  const sample = await db.user.findMany({ where: { isSample: true }, select: { id: true } });
  const ids = sample.map((u) => u.id);
  const r = await db.$transaction(async (tx) => {
    // Rows that reference sample users without cascading.
    const athletes = await tx.athlete.findMany({ where: { userId: { in: ids } }, select: { id: true } });
    const aIds = athletes.map((a) => a.id);
    await tx.nutritionReply.deleteMany({ where: { authorId: { in: ids } } });
    await tx.nutritionRequest.deleteMany({ where: { OR: [{ submittedById: { in: ids } }, { athleteId: { in: aIds } }] } });
    await tx.message.deleteMany({ where: { authorId: { in: ids } } });
    await tx.thread.deleteMany({ where: { participants: { none: {} } } });
    await tx.workoutPlan.deleteMany({ where: { authorId: { in: ids } } });
    await tx.drylandPlan.deleteMany({ where: { authorId: { in: ids } } });
    await tx.performanceResult.deleteMany({ where: { OR: [{ recordedById: { in: ids } }, { athleteId: { in: aIds } }] } });
    await tx.attendance.deleteMany({ where: { OR: [{ recordedById: { in: ids } }, { athleteId: { in: aIds } }] } });
    await tx.coachNote.deleteMany({ where: { authorId: { in: ids } } });
    const users = await tx.user.deleteMany({ where: { id: { in: ids } } });
    await tx.thread.deleteMany({ where: { participants: { none: {} } } });
    await tx.group.deleteMany({ where: { name: { contains: "(نمونه)" } } });
    await tx.season.deleteMany({ where: { name: { contains: "(نمونه)" } } });
    await tx.publicCoachProfile.deleteMany({ where: { name: { contains: "(نمونه)" } } });
    await tx.inquiryRequest.deleteMany({ where: { guardianName: { contains: "(نمونه)" } } });
    return users.count;
  });
  console.log(`Removed ${r} sample user(s) and their data. Review public content (programs, FAQ) in /app/admin/content.`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
