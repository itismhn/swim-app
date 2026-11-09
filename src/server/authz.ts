/**
 * Server-side authorization policy. EVERY read or write of athlete-scoped data
 * must be filtered through one of these where-builders or assertions.
 *
 * Rules:
 *  - ADMIN, HEAD_COACH: all athletes and groups.
 *  - COACH: only groups they are assigned to (GroupCoach) and athletes in them.
 *  - GUARDIAN: only athletes with a VERIFIED GuardianLink to them.
 *  - ATHLETE: only themselves.
 *  - NUTRITIONIST: no athlete profiles; only nutrition requests assigned to them.
 *
 * Loaders return null for both "missing" and "forbidden" so that changing an id
 * in the URL can never reveal whether another athlete exists.
 */
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { ForbiddenError, isAcademyWide, isStaff, type Viewer } from "./viewer";

const NONE = "__no_access__";

// ───────── Groups ─────────

export function groupWhere(v: Viewer): Prisma.GroupWhereInput {
  if (isAcademyWide(v)) return {};
  if (v.role === "COACH") return { coaches: { some: { userId: v.id } } };
  return { id: NONE };
}

export async function canManageGroup(v: Viewer, groupId: string): Promise<boolean> {
  if (!isStaff(v)) return false;
  return (await db.group.count({ where: { AND: [{ id: groupId }, groupWhere(v)] } })) > 0;
}

// ───────── Athletes ─────────

export function athleteWhere(v: Viewer): Prisma.AthleteWhereInput {
  switch (v.role) {
    case "ADMIN":
    case "HEAD_COACH":
      return {};
    case "COACH":
      return { group: { coaches: { some: { userId: v.id } } } };
    case "GUARDIAN":
      return { guardianLinks: { some: { guardianId: v.id, status: "VERIFIED" } } };
    case "ATHLETE":
      return { userId: v.id };
    default:
      return { id: NONE };
  }
}

export async function canViewAthlete(v: Viewer, athleteId: string): Promise<boolean> {
  return (await db.athlete.count({ where: { AND: [{ id: athleteId }, athleteWhere(v)] } })) > 0;
}

/** Profile edits, attendance, results, coach notes: staff with scope only. */
export async function canEditAthlete(v: Viewer, athleteId: string): Promise<boolean> {
  if (!isStaff(v)) return false;
  return canViewAthlete(v, athleteId);
}

export async function assertCanEditAthlete(v: Viewer, athleteId: string) {
  if (!(await canEditAthlete(v, athleteId))) throw new ForbiddenError();
}

/** Medical/restriction data: academy-wide staff, the athlete's coaches, verified guardians, the athlete. */
export async function canViewMedical(v: Viewer, athleteId: string): Promise<boolean> {
  if (v.role === "NUTRITIONIST") return false;
  return canViewAthlete(v, athleteId);
}

/** Medical data may be written by scoped staff or a verified guardian (who gives consent). */
export async function canEditMedical(v: Viewer, athleteId: string): Promise<boolean> {
  if (v.role === "GUARDIAN" || isStaff(v)) return canViewAthlete(v, athleteId);
  return false;
}

/** Notes visible to the viewer: staff see all; athletes/guardians only SHARED notes. */
export function coachNoteWhere(v: Viewer): Prisma.CoachNoteWhereInput {
  if (isStaff(v)) return {};
  return { visibility: "SHARED" };
}

/** Loads one athlete only if the viewer may see it. */
export async function getAthleteForViewer(v: Viewer, athleteId: string) {
  return db.athlete.findFirst({
    where: { AND: [{ id: athleteId }, athleteWhere(v)] },
    include: {
      user: { select: { name: true, email: true, phone: true, isSample: true } },
      group: { select: { id: true, name: true, coaches: { select: { user: { select: { id: true, name: true } } } } } },
      guardianLinks: { include: { guardian: { select: { id: true, name: true, phone: true, email: true } } } },
    },
  });
}

// ───────── Sessions & attendance ─────────

export function sessionWhere(v: Viewer): Prisma.TrainingSessionWhereInput {
  if (isStaff(v)) return { group: groupWhere(v) };
  if (v.role === "ATHLETE" || v.role === "GUARDIAN") return { group: { athletes: { some: athleteWhere(v) } } };
  return { id: NONE };
}

export async function canTakeAttendance(v: Viewer, sessionId: string): Promise<boolean> {
  if (!isStaff(v)) return false;
  return (await db.trainingSession.count({ where: { AND: [{ id: sessionId }, sessionWhere(v)] } })) > 0;
}

export function attendanceWhere(v: Viewer): Prisma.AttendanceWhereInput {
  return { athlete: athleteWhere(v) };
}

// ───────── Results ─────────

export function resultWhere(v: Viewer): Prisma.PerformanceResultWhereInput {
  return { athlete: athleteWhere(v) };
}

// ───────── Workout & dryland plans ─────────

/** Plans addressed to a group or athlete in scope. Non-staff see PUBLISHED only. */
export function workoutPlanWhere(v: Viewer): Prisma.WorkoutPlanWhereInput {
  if (isStaff(v)) {
    if (isAcademyWide(v)) return {};
    return { OR: [{ group: groupWhere(v) }, { athlete: athleteWhere(v) }] };
  }
  if (v.role === "ATHLETE" || v.role === "GUARDIAN") {
    return {
      status: "PUBLISHED",
      OR: [{ athlete: athleteWhere(v) }, { group: { athletes: { some: athleteWhere(v) } } }],
    };
  }
  return { id: NONE };
}

export function drylandPlanWhere(v: Viewer): Prisma.DrylandPlanWhereInput {
  // Same shape as workout plans.
  return workoutPlanWhere(v) as Prisma.DrylandPlanWhereInput;
}

export async function canEditWorkoutPlan(v: Viewer, planId: string) {
  if (!isStaff(v)) return false;
  return (await db.workoutPlan.count({ where: { AND: [{ id: planId }, workoutPlanWhere(v)] } })) > 0;
}

/** Validates the target (group or athlete) a staff member wants to assign a plan to. */
export async function assertCanAssign(v: Viewer, target: { groupId?: string | null; athleteId?: string | null }) {
  if (!isStaff(v)) throw new ForbiddenError();
  if (!!target.groupId === !!target.athleteId) throw new ForbiddenError("یک گروه یا یک ورزشکار انتخاب کنید");
  if (target.groupId && !(await canManageGroup(v, target.groupId))) throw new ForbiddenError();
  if (target.athleteId && !(await canEditAthlete(v, target.athleteId))) throw new ForbiddenError();
}

// ───────── Nutrition ─────────

export function nutritionRequestWhere(v: Viewer): Prisma.NutritionRequestWhereInput {
  switch (v.role) {
    case "ADMIN":
      return {}; // to assign requests to a professional
    case "NUTRITIONIST":
      return { assigneeId: v.id };
    case "ATHLETE":
    case "GUARDIAN":
      return { athlete: athleteWhere(v) };
    default:
      return { id: NONE };
  }
}

/** Allergy details are shown only to the assigned professional, the athlete and verified guardians, and only with consent. */
export function canSeeNutritionAllergies(v: Viewer, req: { assigneeId: string | null; guardianConsent: boolean }) {
  if (!req.guardianConsent) return false;
  return (v.role === "NUTRITIONIST" && req.assigneeId === v.id) || v.role === "ATHLETE" || v.role === "GUARDIAN";
}

// ───────── Messaging ─────────

export function threadWhere(v: Viewer): Prisma.ThreadWhereInput {
  return { participants: { some: { userId: v.id } } };
}

/** Users the viewer may start a conversation with. */
export async function messageableUsers(v: Viewer) {
  if (isStaff(v)) {
    const athletes = await db.athlete.findMany({
      where: athleteWhere(v),
      select: {
        id: true,
        user: { select: { id: true, name: true } },
        guardianLinks: { where: { status: "VERIFIED" }, select: { guardian: { select: { id: true, name: true } } } },
      },
    });
    return athletes.flatMap((a) => [
      { userId: a.user.id, name: a.user.name, athleteId: a.id, kind: "ATHLETE" as const },
      ...a.guardianLinks.map((g) => ({ userId: g.guardian.id, name: `${g.guardian.name} (سرپرست ${a.user.name})`, athleteId: a.id, kind: "GUARDIAN" as const })),
    ]);
  }
  if (v.role === "ATHLETE" || v.role === "GUARDIAN") {
    const athletes = await db.athlete.findMany({
      where: athleteWhere(v),
      select: { id: true, user: { select: { name: true } }, group: { select: { coaches: { select: { user: { select: { id: true, name: true } } } } } } },
    });
    const heads = await db.user.findMany({ where: { role: "HEAD_COACH", active: true }, select: { id: true, name: true } });
    return athletes.flatMap((a) => [
      ...(a.group?.coaches ?? []).map((c) => ({ userId: c.user.id, name: `مربی ${c.user.name}`, athleteId: a.id, kind: "COACH" as const })),
      ...heads.map((h) => ({ userId: h.id, name: `سرمربی ${h.name}`, athleteId: a.id, kind: "COACH" as const })),
    ]);
  }
  return [];
}
