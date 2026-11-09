import { describe, expect, it } from "vitest";
import { gregorianToJalali, jalaliToGregorian, parseJalaliDate, tehranDateTimeToUtc, toJalaliString } from "@/lib/domain/jalali";

describe("jalali", () => {
  it("converts known dates", () => {
    expect(gregorianToJalali(2025, 3, 21)).toEqual([1404, 1, 1]);
    expect(jalaliToGregorian(1405, 8, 18)).toEqual([2026, 11, 9]);
  });
  it("round-trips a full year", () => {
    for (let i = 0; i < 400; i++) {
      const d = new Date(Date.UTC(2026, 0, 1 + i));
      const [jy, jm, jd] = gregorianToJalali(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
      expect(parseJalaliDate(`${jy}/${jm}/${jd}`)!.getTime()).toBe(d.getTime());
    }
  });
  it("rejects invalid dates", () => {
    expect(parseJalaliDate("1405/13/01")).toBeNull();
    expect(parseJalaliDate("1405/07/31")).toBeNull();
  });
  it("uses Tehran time (UTC+3:30)", () => {
    const d = tehranDateTimeToUtc("1405/08/18", "16:00")!;
    expect(d.toISOString()).toBe("2026-11-09T12:30:00.000Z");
    expect(toJalaliString(new Date("2026-11-09T21:00:00Z"))).toBe("1405/08/19"); // already next day in Tehran
  });
});
