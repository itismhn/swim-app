import { describe, expect, it } from "vitest";
import { attendanceSummary, type AttendanceRow } from "@/lib/domain/attendance";

describe("attendance rate", () => {
  const rows: AttendanceRow[] = [
    { sessionStatus: "COMPLETED", status: "PRESENT" },
    { sessionStatus: "COMPLETED", status: "LATE" },
    { sessionStatus: "COMPLETED", status: "ABSENT" },
    { sessionStatus: "COMPLETED", status: "LEFT_EARLY" },
    { sessionStatus: "CANCELLED", status: null },
    { sessionStatus: "CANCELLED", status: "ABSENT" }, // stale record on a cancelled session
  ];

  it("excludes cancelled sessions from the rate", () => {
    const s = attendanceSummary(rows);
    expect(s.eligible).toBe(4);
    expect(s.attended).toBe(3);
    expect(s.rate).toBe(0.75);
    expect(s.cancelledExcluded).toBe(2);
  });

  it("only cancelled sessions → no rate", () => {
    expect(attendanceSummary([{ sessionStatus: "CANCELLED", status: "PRESENT" }]).rate).toBeNull();
  });

  it("excused absences are neutral by default, counted when configured", () => {
    const r: AttendanceRow[] = [
      { sessionStatus: "COMPLETED", status: "PRESENT" },
      { sessionStatus: "COMPLETED", status: "EXCUSED" },
    ];
    expect(attendanceSummary(r).rate).toBe(1);
    expect(attendanceSummary(r, { countExcusedAsAbsent: true }).rate).toBe(0.5);
  });

  it("sessions without a record are not counted", () => {
    expect(attendanceSummary([{ sessionStatus: "SCHEDULED", status: null }]).eligible).toBe(0);
  });
});
