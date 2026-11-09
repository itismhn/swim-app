import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import {
  canEditAthlete, canTakeAttendance, canViewAthlete, canViewMedical, getAthleteForViewer, nutritionRequestWhere, resultWhere, workoutPlanWhere, assertCanAssign,
} from "@/server/authz";
import { buildFixture } from "./fixtures";

let f: Awaited<ReturnType<typeof buildFixture>>;
beforeAll(async () => { f = await buildFixture(); });
afterAll(async () => { await db.$disconnect(); });

describe("athlete profile access (changing the id in the URL)", () => {
  it("an athlete cannot load another athlete's profile", async () => {
    expect(await getAthleteForViewer(f.viewers.athA, f.athleteB.id)).toBeNull();
    expect((await getAthleteForViewer(f.viewers.athA, f.athleteA.id))?.id).toBe(f.athleteA.id);
  });

  it("an athlete cannot read another athlete's results", async () => {
    const rows = await db.performanceResult.findMany({ where: { AND: [resultWhere(f.viewers.athA), { athleteId: f.athleteB.id }] } });
    expect(rows).toHaveLength(0);
    const own = await db.performanceResult.findMany({ where: { AND: [resultWhere(f.viewers.athB), { athleteId: f.athleteB.id }] } });
    expect(own).toHaveLength(1);
  });

  it("a coach of group A cannot see or edit an athlete in group B", async () => {
    expect(await getAthleteForViewer(f.viewers.coachA, f.athleteB.id)).toBeNull();
    expect(await canEditAthlete(f.viewers.coachA, f.athleteB.id)).toBe(false);
    expect(await canEditAthlete(f.viewers.coachA, f.athleteA.id)).toBe(true);
    expect(await canTakeAttendance(f.viewers.coachA, f.sessionB.id)).toBe(false);
    expect(await canTakeAttendance(f.viewers.coachB, f.sessionB.id)).toBe(true);
  });

  it("a coach cannot assign a plan to another coach's group or athlete", async () => {
    await expect(assertCanAssign(f.viewers.coachA, { groupId: f.groupB.id })).rejects.toThrow();
    await expect(assertCanAssign(f.viewers.coachA, { athleteId: f.athleteB.id })).rejects.toThrow();
    await expect(assertCanAssign(f.viewers.coachA, { groupId: f.groupA.id })).resolves.toBeUndefined();
  });

  it("a guardian with a PENDING link has no access; a VERIFIED one does", async () => {
    expect(await getAthleteForViewer(f.viewers.gPending, f.athleteB.id)).toBeNull();
    expect(await canViewAthlete(f.viewers.gVerified, f.athleteA.id)).toBe(true);
    expect(await canViewAthlete(f.viewers.gVerified, f.athleteB.id)).toBe(false);
    expect(await canEditAthlete(f.viewers.gVerified, f.athleteA.id)).toBe(false); // view-only
  });

  it("admins see everyone; nutritionists see no profiles or medical data", async () => {
    expect(await canViewAthlete(f.viewers.admin, f.athleteB.id)).toBe(true);
    expect(await getAthleteForViewer(f.viewers.nutri, f.athleteA.id)).toBeNull();
    expect(await canViewMedical(f.viewers.nutri, f.athleteA.id)).toBe(false);
  });
});

describe("plans and nutrition scoping", () => {
  it("athletes see published plans of their group only, never drafts", async () => {
    const ids = (await db.workoutPlan.findMany({ where: workoutPlanWhere(f.viewers.athA), select: { id: true } })).map((p) => p.id);
    expect(ids).toContain(f.publishedA.id);
    expect(ids).not.toContain(f.draftA.id);
    expect(await db.workoutPlan.count({ where: workoutPlanWhere(f.viewers.athB) })).toBe(0);
  });

  it("a nutritionist only sees requests assigned to them", async () => {
    expect(await db.nutritionRequest.count({ where: { AND: [{ id: f.nutritionReq.id }, nutritionRequestWhere(f.viewers.nutri)] } })).toBe(1);
    expect(await db.nutritionRequest.count({ where: { AND: [{ id: f.nutritionReq.id }, nutritionRequestWhere(f.viewers.nutri2)] } })).toBe(0);
    expect(await db.nutritionRequest.count({ where: nutritionRequestWhere(f.viewers.coachA) })).toBe(0);
  });
});
