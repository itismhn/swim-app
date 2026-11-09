/**
 * Creates (or promotes) a real academy administrator.
 *
 *   ADMIN_PASSWORD='a-long-password' npm run create-admin -- admin@academy.ir "نام مدیر"
 *
 * The password is read from the ADMIN_PASSWORD environment variable so it never
 * appears in shell history as an argument. Existing sessions of that user are revoked.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const [email, ...nameParts] = process.argv.slice(2);
  const name = nameParts.join(" ").trim();
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!email || !/^\S+@\S+\.\S+$/.test(email) || !name) {
    throw new Error('Usage: ADMIN_PASSWORD=... npm run create-admin -- <email> "<full name>"');
  }
  if (password.length < 12) throw new Error("ADMIN_PASSWORD must be at least 12 characters.");
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await db.user.upsert({
    where: { email: email.toLowerCase() },
    create: { email: email.toLowerCase(), name, role: "ADMIN", passwordHash, isSample: false },
    update: { name, role: "ADMIN", passwordHash, active: true, isSample: false },
  });
  await db.session.deleteMany({ where: { userId: user.id } });
  await db.academySetting.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });
  await db.auditLog.create({ data: { actorId: null, action: "user.create-admin.cli", entity: "User", entityId: user.id } });
  console.log(`Admin ready: ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
