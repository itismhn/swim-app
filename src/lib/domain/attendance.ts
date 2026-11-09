/**
 * Attendance-rate calculation.
 * - Cancelled sessions are always excluded.
 * - Sessions without a record for the athlete are not counted (not yet taken).
 * - PRESENT, LATE and LEFT_EARLY count as attended.
 * - EXCUSED is excluded from the denominator unless countExcusedAsAbsent is set.
 */
export type SessionStatusT = "SCHEDULED" | "COMPLETED" | "CANCELLED";
export type AttendanceStatusT = "PRESENT" | "ABSENT" | "EXCUSED" | "LATE" | "LEFT_EARLY";

export interface AttendanceRow {
  sessionStatus: SessionStatusT;
  status: AttendanceStatusT | null;
}

export interface AttendanceSummary {
  eligible: number;
  attended: number;
  rate: number | null;
  counts: Record<AttendanceStatusT, number>;
  cancelledExcluded: number;
}

const ATTENDED: AttendanceStatusT[] = ["PRESENT", "LATE", "LEFT_EARLY"];

export function attendanceSummary(
  rows: AttendanceRow[],
  opts: { countExcusedAsAbsent?: boolean } = {},
): AttendanceSummary {
  const counts: Record<AttendanceStatusT, number> = {
    PRESENT: 0, ABSENT: 0, EXCUSED: 0, LATE: 0, LEFT_EARLY: 0,
  };
  let eligible = 0;
  let attended = 0;
  let cancelledExcluded = 0;
  for (const r of rows) {
    if (r.sessionStatus === "CANCELLED") {
      cancelledExcluded++;
      continue;
    }
    if (!r.status) continue;
    counts[r.status]++;
    if (r.status === "EXCUSED" && !opts.countExcusedAsAbsent) continue;
    eligible++;
    if (ATTENDED.includes(r.status)) attended++;
  }
  return { eligible, attended, rate: eligible ? attended / eligible : null, counts, cancelledExcluded };
}
