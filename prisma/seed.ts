/**
 * Seeds SYNTHETIC demo data. Every person here is fictional and flagged isSample,
 * and names carry the label «(نمونه)». Never load real athlete data with this script.
 */
import "dotenv/config";
import { PrismaClient, type Role, type Stroke, type AttendanceStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { planMeters } from "../src/lib/domain/volume";

const db = new PrismaClient();
const TEHRAN_OFFSET_MS = 210 * 60000;

// Deterministic PRNG so the demo looks the same on every reseed.
let seed = 42;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const pick = <T,>(a: readonly T[]) => a[Math.floor(rand() * a.length)];

const dayUTC = (offsetDays: number) => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays));
};
/** Tehran-local HH:MM on the given UTC-midnight date → UTC instant. */
const atTehran = (d: Date, hh: number, mm = 0) => new Date(d.getTime() + (hh * 60 + mm) * 60000 - TEHRAN_OFFSET_MS);
const S = (n: string) => `${n} (نمونه)`;

async function main() {
  const password = process.env.SEED_DEMO_PASSWORD;
  if (!password || password.length < 8) throw new Error("Set SEED_DEMO_PASSWORD (min 8 chars) in .env before seeding.");
  const passwordHash = await bcrypt.hash(password, 12);

  // Wipe in dependency order (dev/demo database only).
  const tables = await db.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations'`;
  await db.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(",")} RESTART IDENTITY CASCADE`);

  await db.academySetting.create({
    data: {
      id: 1, academyName: "آکادمی شنای موج آبی (نمونه)", poolLengthMeters: 25, sessionsPerWeek: 3, sessionMinutes: 120,
      contactPhone: "۰۲۱-۰۰۰۰۰۰۰۰ (نمونه)", contactEmail: "info@example.com", contactAddress: "تهران، مجموعه ورزشی نمونه",
    },
  });

  const mkUser = (email: string, name: string, role: Role, phone?: string) =>
    db.user.create({ data: { email, name: S(name), role, passwordHash, isSample: true, phone } });

  const admin = await mkUser("admin@example.com", "مریم مدیری", "ADMIN");
  const head = await mkUser("head@example.com", "رضا سرمربی", "HEAD_COACH");
  const coach1 = await mkUser("coach1@example.com", "نیما مربی", "COACH");
  const coach2 = await mkUser("coach2@example.com", "سارا مربی", "COACH");
  const nutri = await mkUser("nutrition@example.com", "دکتر لیلا تغذیه", "NUTRITIONIST");

  const equipment = await Promise.all(
    [["FINS", "فین"], ["KICKBOARD", "تخته شنا"], ["PULL_BUOY", "پول بوی"], ["PADDLES", "پدل دست"], ["SNORKEL", "اسنورکل"]].map(([key, name]) =>
      db.equipment.create({ data: { key, name, builtIn: true } }),
    ),
  );
  const eq = Object.fromEntries(equipment.map((e) => [e.key, e.id]));

  // Groups and weekly schedule (Iranian week: 0 = Saturday).
  const groups = [
    { name: "تیم مسابقه", level: "رقابتی", coach: coach1, slots: [0, 2, 4], hour: 16 },
    { name: "نوجوانان پیشرفته", level: "نیمه‌حرفه‌ای", coach: coach2, slots: [1, 3, 5], hour: 17 },
    { name: "پایه رقابتی", level: "پایه", coach: coach2, slots: [0, 2, 4], hour: 18 },
  ];
  const groupRows = [];
  for (const g of groups) {
    const row = await db.group.create({
      data: {
        name: S(g.name), level: g.level, location: "استخر ۲۵ متری مجموعه نمونه",
        coaches: { create: [{ userId: g.coach.id, isLead: true }] },
        slots: { create: g.slots.map((weekday) => ({ weekday, startTime: `${g.hour}:00`, minutes: 120 })) },
      },
    });
    groupRows.push({ ...g, row });
  }

  // Athletes and guardians.
  const firstNames = ["آرین", "کیان", "هستی", "پارسا", "نیلوفر", "امیرعلی", "یاسمن", "سامان", "ترانه", "بردیا", "رها", "ماهان"];
  const specs: Stroke[][] = [["FREESTYLE"], ["BACKSTROKE"], ["BUTTERFLY", "FREESTYLE"], ["BREASTSTROKE"], ["FREESTYLE", "BACKSTROKE"], ["BUTTERFLY"]];
  const athletes = [];
  for (let i = 0; i < firstNames.length; i++) {
    const group = groupRows[i % 3].row;
    const user = await mkUser(`athlete${i + 1}@example.com`, `${firstNames[i]} شناگر`, "ATHLETE");
    const age = 13 + (i % 5);
    const a = await db.athlete.create({
      data: {
        userId: user.id,
        birthDate: new Date(Date.UTC(new Date().getUTCFullYear() - age, (i * 3) % 12, 5 + i)),
        groupId: group.id,
        enrolledAt: dayUTC(-400 + i * 10),
        status: i === 11 ? "PAUSED" : "ACTIVE",
        specialtyStrokes: specs[i % specs.length],
        secondaryStrokes: i % 2 ? ["IM"] : [],
        trainingGoals: "بهبود برگشت‌ها و ضربات پای زیرآبی (نمونه)",
        seasonGoals: "رسیدن به زمان هدف ۱۰۰ متر در مسابقات پایان فصل (نمونه)",
        emergencyName: S("تماس اضطراری"),
        emergencyPhone: "0912000000" + (i % 10),
      },
    });
    athletes.push({ ...a, user, groupId: group.id });
  }

  const guardians = [];
  for (let i = 0; i < 6; i++) {
    const g = await mkUser(`parent${i + 1}@example.com`, `والد ${firstNames[i]}`, "GUARDIAN", "0935000000" + i);
    guardians.push(g);
    await db.guardianLink.create({
      data: {
        guardianId: g.id, athleteId: athletes[i].id, relation: i % 2 ? "مادر" : "پدر",
        status: i === 5 ? "PENDING" : "VERIFIED", // parent6 is still pending verification
        verifiedById: i === 5 ? null : admin.id, verifiedAt: i === 5 ? null : new Date(),
      },
    });
  }

  // Medical restriction with guardian consent (sample) for athlete 1.
  await db.athleteMedical.create({
    data: {
      athleteId: athletes[0].id, trainingRestrictions: "پرهیز از پروانه با شدت بالا تا اطلاع ثانوی (نمونه)",
      allergies: null, guardianConsentAt: new Date(), consentByUserId: guardians[0].id,
    },
  });

  await db.coachNote.createMany({
    data: [
      { athleteId: athletes[0].id, authorId: coach1.id, visibility: "SHARED", body: "استارت عالی بود؛ روی خروج از دیوار بیشتر کار کنیم. (نمونه)" },
      { athleteId: athletes[0].id, authorId: coach1.id, visibility: "STAFF_ONLY", body: "یادداشت داخلی کادر: بار تمرین هفته آینده کمتر شود. (نمونه)" },
    ],
  });

  // Season, milestones, target competition.
  const seasonStart = dayUTC(-42);
  const season = await db.season.create({
    data: {
      name: "فصل پاییز–زمستان (نمونه)", startDate: seasonStart, endDate: dayUTC(-42 + 7 * 24), active: true,
      goals: "افزایش حجم هوازی در ۸ هفته اول، سپس تمرکز بر سرعت و آمادگی مسابقه.",
      milestones: {
        create: [
          { week: 8, title: "تست میانی هفته ۸", description: "تست ۱۰۰ و ۲۰۰ متر رشته تخصصی (قابل ویرایش)" },
          { week: 16, title: "ارزیابی هفته ۱۶", description: "تست زمان و بازبینی اهداف فصل (قابل ویرایش)" },
        ],
      },
      competitions: { create: [{ name: "مسابقات پایان فصل (نمونه)", date: dayUTC(-42 + 7 * 20), venue: "استخر ۵۰ متری نمونه", course: "LCM", isTarget: true }] },
    },
  });

  // Sessions: past 6 weeks + next 2 weeks, generated from weekly slots.
  const statuses: AttendanceStatus[] = ["PRESENT", "PRESENT", "PRESENT", "PRESENT", "LATE", "ABSENT", "EXCUSED", "LEFT_EARLY"];
  for (const g of groupRows) {
    for (let d = -42; d <= 14; d++) {
      const date = dayUTC(d);
      const iranWeekday = (date.getUTCDay() + 1) % 7;
      if (!g.slots.includes(iranWeekday)) continue;
      const cancelled = rand() < 0.08;
      const past = d < 0;
      const session = await db.trainingSession.create({
        data: {
          groupId: g.row.id, startsAt: atTehran(date, g.hour), minutes: 120, location: "استخر ۲۵ متری مجموعه نمونه",
          status: cancelled ? "CANCELLED" : past ? "COMPLETED" : "SCHEDULED",
          note: cancelled ? "لغو به دلیل تعمیرات استخر (نمونه)" : null,
        },
      });
      if (past && !cancelled) {
        for (const a of athletes.filter((x) => x.groupId === g.row.id)) {
          await db.attendance.create({
            data: {
              sessionId: session.id, athleteId: a.id, status: pick(statuses), recordedById: g.coach.id, recordedAt: session.startsAt,
            },
          });
        }
      }
    }
  }

  // Workout plans: one published with the 20 m + 5 m combined set, one draft.
  const sections = [
    { kind: "WARMUP", sets: [{ rounds: 1, reps: 1, stroke: "CHOICE", intensity: "EASY", restSec: 0, segments: [{ meters: 400 }], focus: "کشش بدن و تنفس دوطرفه", equipment: [] as string[] }] },
    { kind: "TECHNIQUE", sets: [{ rounds: 1, reps: 8, stroke: "FREESTYLE", intensity: "TECHNIQUE", restSec: 15, segments: [{ meters: 50 }], focus: "دریل کچ‌آپ", equipment: ["SNORKEL"] }] },
    { kind: "KICK_PULL", sets: [{ rounds: 1, reps: 6, stroke: "FREESTYLE", intensity: "AEROBIC", restSec: 20, segments: [{ meters: 100 }], focus: "پول با تنفس هر ۳ دست", equipment: ["PULL_BUOY", "PADDLES"] }] },
    {
      kind: "MAIN",
      sets: [
        { rounds: 1, reps: 10, stroke: "FREESTYLE", intensity: "SPRINT", restSec: 30, segments: [{ meters: 20, description: "تمرکز با حداکثر سرعت" }, { meters: 5, description: "آرام تا دیوار" }], focus: "سرعت اولیه", equipment: [] },
        { rounds: 3, reps: 4, stroke: "FREESTYLE", intensity: "THRESHOLD", restSec: 20, segments: [{ meters: 100 }], focus: "حفظ ریتم", equipment: [] },
      ],
    },
    { kind: "SKILLS", sets: [{ rounds: 1, reps: 8, stroke: "FREESTYLE", intensity: "TECHNIQUE", restSec: 30, segments: [{ meters: 15, description: "استارت + زیرآبی" }, { meters: 10, description: "آرام" }], focus: "استارت و دلفین زیرآبی", equipment: ["FINS"] }] },
    { kind: "COOLDOWN", sets: [{ rounds: 1, reps: 1, stroke: "CHOICE", intensity: "RECOVERY", restSec: 0, segments: [{ meters: 200 }], focus: "", equipment: [] }] },
  ] as const;
  const planned = planMeters(sections.map((s) => ({ sets: s.sets.map((x) => ({ ...x, segments: [...x.segments] })) })));

  for (const [title, status, dayOffset] of [["تمرین سرعت و استارت (نمونه)", "PUBLISHED", 0], ["پیش‌نویس تمرین هوازی (نمونه)", "DRAFT", 2]] as const) {
    const plan = await db.workoutPlan.create({
      data: {
        title, groupId: groupRows[0].row.id, date: dayUTC(dayOffset), poolLength: 25, status, plannedMeters: planned,
        authorId: coach1.id, publishedAt: status === "PUBLISHED" ? new Date() : null,
      },
    });
    for (const [si, s] of sections.entries()) {
      await db.workoutSection.create({
        data: {
          planId: plan.id, kind: s.kind, order: si,
          sets: {
            create: s.sets.map((x, xi) => ({
              order: xi, rounds: x.rounds, reps: x.reps, stroke: x.stroke, intensity: x.intensity, restSec: x.restSec, focus: x.focus || null,
              segments: { create: x.segments.map((seg, gi) => ({ order: gi, meters: seg.meters, description: "description" in seg ? seg.description : null })) },
              equipment: { create: x.equipment.map((k) => ({ equipmentId: eq[k] })) },
            })),
          },
        },
      });
    }
    await db.workoutPlanRevision.create({ data: { planId: plan.id, version: 1, status, snapshot: { sections } as object, authorId: coach1.id } });
    if (status === "PUBLISHED") {
      await db.workoutCompletion.create({ data: { planId: plan.id, athleteId: athletes[0].id, actualMeters: planned - 300, rpe: 7, feedback: "ست اصلی سخت بود ولی تمامش کردم. (نمونه)" } });
    }
  }

  // Dryland exercise library and a published plan.
  const exercises = await Promise.all(
    [
      ["پلانک", "مرکز بدن (Core)", "حفظ بدن در یک خط صاف روی ساعدها.", "کمر را گود نکنید؛ در صورت درد کمر متوقف شوید."],
      ["اسکوات با وزن بدن", "پایین‌تنه", "پاها به عرض شانه، پایین رفتن تا موازی.", "زانوها هم‌راستای انگشتان پا."],
      ["کش‌ کشی چرخش خارجی شانه", "شانه / روتاتور کاف", "با کش مقاومتی سبک، آرنج کنار بدن.", "فقط با کش سبک؛ درد شانه = توقف و اطلاع به مربی."],
      ["پرش اسکوات", "پایین‌تنه / توان", "برای قدرت انفجاری استارت.", "فرود نرم؛ روی سطح مناسب."],
      ["سوپرمن", "پشت / زنجیره خلفی", "خوابیده روی شکم، بالا آوردن دست و پا.", "حرکت کنترل‌شده، بدون فشار به گردن."],
      ["شنای سوئدی", "سینه / بازو", "حفظ بدن صاف.", "در صورت نیاز روی زانو انجام شود."],
    ].map(([name, muscleGroup, description, safetyNotes]) => db.exercise.create({ data: { name, muscleGroup, description, safetyNotes } })),
  );
  await db.drylandPlan.create({
    data: {
      title: "خشکی: مرکز بدن و پیشگیری شانه (نمونه)", groupId: groupRows[0].row.id, date: dayUTC(1), status: "PUBLISHED", authorId: coach1.id,
      items: {
        create: [
          { exerciseId: exercises[0].id, order: 0, sets: 3, durationSec: 40, restSec: 30 },
          { exerciseId: exercises[2].id, order: 1, sets: 3, reps: 15, restSec: 30, notes: "کش سبک" },
          { exerciseId: exercises[1].id, order: 2, sets: 3, reps: 12, restSec: 45 },
        ],
      },
    },
  });

  // Performance results: a progression over the season, mixed courses and types.
  for (const [i, a] of athletes.slice(0, 9).entries()) {
    const stroke = a.specialtyStrokes[0];
    let base = 62000 + i * 1500 + (stroke === "BREASTSTROKE" ? 9000 : stroke === "BUTTERFLY" ? 4000 : 0);
    for (let w = 0; w < 6; w++) {
      const official = w === 2 || w === 5;
      await db.performanceResult.create({
        data: {
          athleteId: a.id, stroke, distance: 100, course: "SCM", timeMs: Math.round(base), date: dayUTC(-42 + w * 7),
          type: official ? "OFFICIAL" : "PRACTICE_TEST", isBaseline: w === 0, venue: official ? "مسابقات باشگاهی (نمونه)" : "استخر تمرین",
          splitsMs: [Math.round(base * 0.48), Math.round(base * 0.52)], recordedById: groupRows[i % 3].coach.id,
        },
      });
      base -= 300 + rand() * 500;
    }
    // A long-course result: faster-looking but NOT comparable with 25 m results.
    await db.performanceResult.create({
      data: {
        athleteId: a.id, stroke, distance: 100, course: "LCM", timeMs: Math.round(base + 1800), date: dayUTC(-10),
        type: "OFFICIAL", venue: "استخر ۵۰ متری (نمونه)", splitsMs: [], recordedById: head.id,
      },
    });
    await db.seasonTarget.create({ data: { seasonId: season.id, athleteId: a.id, stroke, distance: 100, course: "SCM", timeMs: Math.round(base - 1500) } });
  }

  // Nutrition education and one request.
  await db.nutritionArticle.createMany({
    data: [
      { title: "آب‌رسانی در تمرینات طولانی", summary: "چرا شناگران هم تشنه می‌شوند؟", body: "در آب هم تعریق رخ می‌دهد. قبل، حین و بعد از تمرین آب بنوشید. این مطلب آموزشی عمومی است و جایگزین مشاوره فردی نیست." },
      { title: "میان‌وعده قبل از تمرین", summary: "انرژی کافی برای دو ساعت تمرین", body: "یک تا دو ساعت قبل از تمرین، میان‌وعده‌ای سبک و سرشار از کربوهیدرات مانند نان و میوه انتخاب کنید. محتوای آموزشی عمومی." },
      { title: "ریکاوری بعد از تمرین", summary: "ترکیب پروتئین و کربوهیدرات", body: "پس از تمرین، یک وعده متعادل شامل پروتئین و کربوهیدرات به بازسازی کمک می‌کند. برای نیازهای فردی با متخصص تغذیه مشورت کنید." },
    ],
  });
  await db.nutritionRequest.create({
    data: {
      athleteId: athletes[0].id, submittedById: guardians[0].id, assigneeId: nutri.id, topic: "تغذیه روز مسابقه",
      question: "در روز مسابقه با سه ماده، بین ماده‌ها چه بخورد؟ (نمونه)", guardianConsent: false, status: "OPEN",
    },
  });

  // A thread between a coach and an under-18 athlete: guardian is included for oversight.
  const thread = await db.thread.create({
    data: {
      subject: "بازخورد تمرین سرعت (نمونه)", athleteId: athletes[0].id,
      participants: { create: [{ userId: coach1.id, lastReadAt: new Date() }, { userId: athletes[0].userId }, { userId: guardians[0].id, oversight: true }] },
      messages: { create: [{ authorId: coach1.id, body: "ست اصلی امروز عالی بود. فردا روی برگشت‌ها کار می‌کنیم. (نمونه)" }] },
    },
  });
  await db.notification.createMany({
    data: [
      { userId: athletes[0].userId, type: "MESSAGE", title: "پیام جدید از مربی", link: `/app/messages/${thread.id}` },
      { userId: athletes[0].userId, type: "PLAN_PUBLISHED", title: "برنامه تمرین جدید منتشر شد", link: "/app/workouts" },
    ],
  });

  // Public site content (contains no private athlete data).
  await db.publicCoachProfile.createMany({
    data: [
      { name: S("رضا سرمربی"), title: "سرمربی", bio: "مربی درجه یک با تجربه هدایت تیم‌های نوجوانان در مسابقات کشوری.", order: 0 },
      { name: S("نیما مربی"), title: "مربی تیم مسابقه", bio: "متخصص سرعت، استارت و برگشت.", order: 1 },
      { name: S("سارا مربی"), title: "مربی گروه نوجوانان", bio: "تمرکز بر تکنیک چهار شنا و آمادگی پایه.", order: 2 },
    ],
  });
  await db.publicGroupInfo.createMany({
    data: [
      { name: "تیم مسابقه", ageRange: "۱۴ تا ۱۸ سال", description: "برای شناگران دارای سابقه مسابقه رسمی.", schedule: "شنبه، دوشنبه، چهارشنبه — ۲ ساعت", order: 0 },
      { name: "نوجوانان پیشرفته", ageRange: "۱۲ تا ۱۶ سال", description: "تقویت تکنیک و استقامت با هدف ورود به مسابقات.", schedule: "یکشنبه، سه‌شنبه، پنجشنبه — ۲ ساعت", order: 1 },
      { name: "پایه رقابتی", ageRange: "۱۱ تا ۱۴ سال", description: "آشنایی با تمرین ساختاریافته و هر چهار شنا.", schedule: "شنبه، دوشنبه، چهارشنبه — ۲ ساعت", order: 2 },
    ],
  });
  await db.program.createMany({
    data: [
      { title: "تمرین تخصصی در آب", description: "برنامه‌های ساختاریافته با گرم کردن، تکنیک، ست اصلی و مهارت‌های استارت و برگشت.", order: 0 },
      { title: "آمادگی جسمانی خشکی", description: "تمرینات قدرتی و پیشگیری از آسیب متناسب با سن نوجوانان.", order: 1 },
      { title: "آموزش تغذیه ورزشی", description: "محتوای آموزشی عمومی و امکان درخواست مشاوره با متخصص.", order: 2 },
      { title: "پایش عملکرد", description: "ثبت زمان‌ها، رکوردهای شخصی و نمودار پیشرفت در طول فصل.", order: 3 },
    ],
  });
  await db.faq.createMany({
    data: [
      { question: "حداقل سن ثبت‌نام چقدر است؟", answer: "گروه‌های رقابتی از ۱۱ سالگی و پس از ارزیابی اولیه پذیرش دارند.", order: 0 },
      { question: "هر جلسه چقدر طول می‌کشد؟", answer: "به‌طور پیش‌فرض هر جلسه ۱۲۰ دقیقه و سه جلسه در هفته است.", order: 1 },
      { question: "والدین چگونه از پیشرفت فرزند مطلع می‌شوند؟", answer: "پس از تأیید رابطه سرپرستی، والدین به حضور و غیاب، برنامه‌ها و رکوردهای فرزند خود دسترسی دارند.", order: 2 },
      { question: "آیا برنامه رژیم غذایی ارائه می‌شود؟", answer: "خیر. محتوای ما آموزشی است؛ مشاوره فردی فقط توسط متخصص تغذیه و با رضایت سرپرست انجام می‌شود.", order: 3 },
    ],
  });
  await db.inquiryRequest.create({
    data: { kind: "REGISTRATION", guardianName: S("متقاضی"), phone: "09120000000", swimmerAge: 13, experience: "دو سال کلاس شنا", message: "درخواست ارزیابی ورودی", consent: true },
  });

  console.log(`Seeded sample data. Demo accounts use the password from SEED_DEMO_PASSWORD. Planned volume of sample plan: ${planned} m`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
