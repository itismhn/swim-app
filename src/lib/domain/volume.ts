/**
 * Workout volume calculations. A rep is made of one or more segments, so
 * "20 m fast + 5 m easy" is a single 25 m rep with two segments.
 * Planned volume (from the plan) is always kept separate from actual volume
 * (reported by athletes in WorkoutCompletion).
 */
export interface SegmentInput {
  meters: number;
}
export interface SetInput {
  rounds: number;
  reps: number;
  segments: SegmentInput[];
}
export interface SectionInput {
  sets: SetInput[];
}

const nonNeg = (n: number) => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

export function repMeters(set: Pick<SetInput, "segments">): number {
  return set.segments.reduce((sum, s) => sum + nonNeg(s.meters), 0);
}

export function setMeters(set: SetInput): number {
  return nonNeg(set.rounds) * nonNeg(set.reps) * repMeters(set);
}

export function sectionMeters(section: SectionInput): number {
  return section.sets.reduce((sum, s) => sum + setMeters(s), 0);
}

export function planMeters(sections: SectionInput[]): number {
  return sections.reduce((sum, s) => sum + sectionMeters(s), 0);
}

/** A rep that does not end at a wall (e.g. 30 m in a 25 m pool) is usually a typo. */
export function poolLengthWarning(set: Pick<SetInput, "segments">, poolLength: number): string | null {
  const rep = repMeters(set);
  if (rep === 0) return "طول تکرار صفر است";
  if (poolLength > 0 && rep % poolLength !== 0) {
    return `طول هر تکرار (${rep} متر) مضربی از طول استخر (${poolLength} متر) نیست`;
  }
  return null;
}

/** Share of planned volume actually completed, 0..1+ (null when nothing was planned). */
export function completionRatio(actualMeters: number, plannedMeters: number): number | null {
  if (plannedMeters <= 0) return null;
  return nonNeg(actualMeters) / plannedMeters;
}
