import { describe, expect, it } from "vitest";
import { completionRatio, planMeters, poolLengthWarning, repMeters, setMeters } from "@/lib/domain/volume";

describe("workout volume", () => {
  it("simple set: 8 × 100 = 800", () => {
    expect(setMeters({ rounds: 1, reps: 8, segments: [{ meters: 100 }] })).toBe(800);
  });

  it("combined rep 20 m focus + 5 m easy is one 25 m rep in a 25 m pool", () => {
    const set = { rounds: 1, reps: 10, segments: [{ meters: 20 }, { meters: 5 }] };
    expect(repMeters(set)).toBe(25);
    expect(setMeters(set)).toBe(250);
    expect(poolLengthWarning(set, 25)).toBeNull();
  });

  it("rounds multiply: 3 × (4 × 50) = 600", () => {
    expect(setMeters({ rounds: 3, reps: 4, segments: [{ meters: 50 }] })).toBe(600);
  });

  it("plan total sums all sections and sets", () => {
    const sections = [
      { sets: [{ rounds: 1, reps: 1, segments: [{ meters: 400 }] }] },
      { sets: [{ rounds: 1, reps: 10, segments: [{ meters: 20 }, { meters: 5 }] }] },
      { sets: [{ rounds: 2, reps: 4, segments: [{ meters: 100 }] }, { rounds: 1, reps: 1, segments: [{ meters: 200 }] }] },
    ];
    expect(planMeters(sections)).toBe(400 + 250 + 800 + 200);
  });

  it("warns when a rep does not end at a wall", () => {
    expect(poolLengthWarning({ segments: [{ meters: 30 }] }, 25)).not.toBeNull();
    expect(poolLengthWarning({ segments: [{ meters: 50 }] }, 25)).toBeNull();
    expect(poolLengthWarning({ segments: [{ meters: 25 }] }, 50)).not.toBeNull();
  });

  it("ignores negative / invalid numbers", () => {
    expect(setMeters({ rounds: -1, reps: 4, segments: [{ meters: 50 }] })).toBe(0);
    expect(setMeters({ rounds: 1, reps: 4, segments: [{ meters: NaN }, { meters: 25 }] })).toBe(100);
  });

  it("planned and actual are reported separately", () => {
    expect(completionRatio(3000, 4000)).toBe(0.75);
    expect(completionRatio(500, 0)).toBeNull();
  });
});
