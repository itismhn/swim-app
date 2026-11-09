/**
 * Performance helpers. Times are stored as integer milliseconds; the UI shows
 * hundredths (m:ss.cc). Personal bests are only ever computed among comparable
 * results: same stroke, same distance and same course (pool length).
 */
export type StrokeT = "FREESTYLE" | "BACKSTROKE" | "BREASTSTROKE" | "BUTTERFLY" | "IM" | "CHOICE";
export type CourseT = "SCM" | "LCM" | "SCY";
export type ResultTypeT = "OFFICIAL" | "PRACTICE_TEST";

export interface ResultLike {
  id?: string;
  stroke: StrokeT;
  distance: number;
  course: CourseT;
  timeMs: number;
  type: ResultTypeT;
  date: Date;
}

export const eventKey = (r: Pick<ResultLike, "stroke" | "distance" | "course">) =>
  `${r.stroke}|${r.distance}|${r.course}`;

export function isComparable(a: ResultLike, b: ResultLike): boolean {
  return eventKey(a) === eventKey(b);
}

export function personalBests<T extends ResultLike>(
  results: T[],
  opts: { officialOnly?: boolean } = {},
): Map<string, T> {
  const best = new Map<string, T>();
  for (const r of results) {
    if (opts.officialOnly && r.type !== "OFFICIAL") continue;
    if (!(r.timeMs > 0)) continue;
    const k = eventKey(r);
    const cur = best.get(k);
    if (!cur || r.timeMs < cur.timeMs || (r.timeMs === cur.timeMs && r.date < cur.date)) best.set(k, r);
  }
  return best;
}

/** True when `candidate` beats every comparable result in `history`. */
export function isNewPersonalBest(candidate: ResultLike, history: ResultLike[]): boolean {
  const comparable = history.filter((h) => isComparable(h, candidate) && h.id !== candidate.id);
  return comparable.every((h) => candidate.timeMs < h.timeMs);
}

/** Negative delta = faster (better). */
export function deltaMs(timeMs: number, referenceMs: number | null | undefined): number | null {
  return referenceMs ? timeMs - referenceMs : null;
}

export function formatTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const totalCs = Math.round(ms / 10);
  const cs = totalCs % 100;
  const totalSec = Math.floor(totalCs / 100);
  const s = totalSec % 60;
  const m = Math.floor(totalSec / 60);
  const ss = `${String(s).padStart(m ? 2 : 1, "0")}.${String(cs).padStart(2, "0")}`;
  return m ? `${m}:${ss}` : ss;
}

export function formatDelta(ms: number | null): string {
  if (ms === null) return "—";
  const sign = ms < 0 ? "−" : ms > 0 ? "+" : "±";
  return `${sign}${formatTime(Math.abs(ms))}`;
}

/** Accepts "1:02.35", "62.35", "62", "0:59.9", Persian digits too. Returns ms or null. */
export function parseTime(input: string): number | null {
  const s = toLatinDigits(input).trim().replace("/", ".").replace("٫", ".");
  const m = /^(?:(\d{1,2}):)?(\d{1,3})(?:\.(\d{1,3}))?$/.exec(s);
  if (!m) return null;
  const min = m[1] ? Number(m[1]) : 0;
  const sec = Number(m[2]);
  if (m[1] && sec >= 60) return null;
  const frac = m[3] ? Number(m[3].padEnd(3, "0")) : 0;
  const ms = (min * 60 + sec) * 1000 + frac;
  return ms > 0 ? ms : null;
}

export function toLatinDigits(s: string): string {
  return s
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}
