import { describe, expect, it } from "vitest";
import { eventKey, formatTime, isNewPersonalBest, parseTime, personalBests, type ResultLike } from "@/lib/domain/performance";

const r = (o: Partial<ResultLike>): ResultLike => ({
  stroke: "FREESTYLE", distance: 100, course: "SCM", timeMs: 60000, type: "OFFICIAL", date: new Date("2026-01-01"), ...o,
});

describe("personal bests", () => {
  const results = [
    r({ id: "a", timeMs: 62000 }),
    r({ id: "b", timeMs: 60500, type: "PRACTICE_TEST" }),
    r({ id: "c", timeMs: 59000, course: "LCM" }), // different pool: not comparable
    r({ id: "d", timeMs: 55000, distance: 50 }), // different distance
    r({ id: "e", timeMs: 58000, stroke: "BUTTERFLY" }), // different stroke
  ];

  it("only compares same stroke + distance + course", () => {
    const pb = personalBests(results);
    expect(pb.get(eventKey(r({})))!.id).toBe("b");
    expect(pb.get(eventKey(r({ course: "LCM" })))!.id).toBe("c");
    expect(pb.size).toBe(4);
  });

  it("a fast long-course swim never becomes the short-course PB", () => {
    const pb = personalBests(results);
    expect(pb.get("FREESTYLE|100|SCM")!.timeMs).toBe(60500);
  });

  it("officialOnly ignores practice tests", () => {
    expect(personalBests(results, { officialOnly: true }).get("FREESTYLE|100|SCM")!.id).toBe("a");
  });

  it("detects a new PB only against comparable history", () => {
    expect(isNewPersonalBest(r({ timeMs: 60000 }), results)).toBe(true);
    expect(isNewPersonalBest(r({ timeMs: 61000 }), results)).toBe(false);
    expect(isNewPersonalBest(r({ timeMs: 60000, course: "LCM" }), results)).toBe(false);
    expect(isNewPersonalBest(r({ timeMs: 99000, stroke: "BACKSTROKE" }), results)).toBe(true);
  });
});

describe("time format", () => {
  it("formats and parses hundredths", () => {
    expect(formatTime(62350)).toBe("1:02.35");
    expect(formatTime(28910)).toBe("28.91");
    expect(parseTime("1:02.35")).toBe(62350);
    expect(parseTime("۲۸.۹۱")).toBe(28910);
    expect(parseTime("1:75.00")).toBeNull();
    expect(parseTime("abc")).toBeNull();
  });
});
