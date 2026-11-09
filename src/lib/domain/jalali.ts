/**
 * Jalali (Solar Hijri) calendar helpers and Asia/Tehran time handling.
 * Display uses the built-in Intl Persian calendar; conversion functions are
 * used to turn Jalali date inputs into Gregorian dates for storage.
 * Iran abolished DST in 2022, so Tehran is a fixed UTC+03:30.
 */
export const TZ = "Asia/Tehran";
const TEHRAN_OFFSET_MIN = 210;

function div(a: number, b: number) {
  return Math.trunc(a / b);
}

export function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 + 365 * gy + div(gy2 + 3, 4) - div(gy2 + 99, 100) + div(gy2 + 399, 400) + gd + gdm[gm - 1];
  let jy = -1595 + 33 * div(days, 12053);
  days %= 12053;
  jy += 4 * div(days, 1461);
  days %= 1461;
  if (days > 365) {
    jy += div(days - 1, 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + div(days, 31) : 7 + div(days - 186, 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return [jy, jm, jd];
}

export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  jy += 1595;
  let days = -355668 + 365 * jy + div(jy, 33) * 8 + div((jy % 33) + 3, 4) + jd + (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  let gy = 400 * div(days, 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * div(--days, 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * div(days, 1461);
  days %= 1461;
  if (days > 365) {
    gy += div(days - 1, 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const leap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const sal = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (gm = 0; gm < 13 && gd > sal[gm]; gm++) gd -= sal[gm];
  return [gy, gm, gd];
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Tehran-local calendar parts of an instant (Gregorian). */
export function tehranParts(d: Date) {
  const t = new Date(d.getTime() + TEHRAN_OFFSET_MIN * 60000);
  return {
    y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(),
    hh: t.getUTCHours(), mm: t.getUTCMinutes(), weekday: t.getUTCDay(),
  };
}

/** "1405/08/18" for a stored instant, as seen in Tehran. */
export function toJalaliString(d: Date): string {
  const p = tehranParts(d);
  const [jy, jm, jd] = gregorianToJalali(p.y, p.m, p.d);
  return `${jy}/${pad(jm)}/${pad(jd)}`;
}

/** For @db.Date columns (stored as UTC midnight): convert without zone shift. */
export function dateOnlyToJalaliString(d: Date): string {
  const [jy, jm, jd] = gregorianToJalali(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  return `${jy}/${pad(jm)}/${pad(jd)}`;
}

/** Parse "1405/08/18" (Latin or Persian digits) to a UTC-midnight Date for @db.Date columns. */
export function parseJalaliDate(input: string): Date | null {
  const s = input.trim().replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0));
  const m = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/.exec(s);
  if (!m) return null;
  const [jy, jm, jd] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (jm < 1 || jm > 12 || jd < 1 || jd > (jm <= 6 ? 31 : jm < 12 ? 30 : 30)) return null;
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
  const back = gregorianToJalali(gy, gm, gd);
  if (back[0] !== jy || back[1] !== jm || back[2] !== jd) return null; // e.g. 30 Esfand in a non-leap year
  return new Date(Date.UTC(gy, gm - 1, gd));
}

/** Combine a Jalali date and "HH:MM" Tehran time into a UTC instant. */
export function tehranDateTimeToUtc(jalaliDate: string, hhmm: string): Date | null {
  const day = parseJalaliDate(jalaliDate);
  const t = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!day || !t) return null;
  const h = Number(t[1]);
  const mi = Number(t[2]);
  if (h > 23 || mi > 59) return null;
  return new Date(day.getTime() + (h * 60 + mi - TEHRAN_OFFSET_MIN) * 60000);
}

/** UTC instant of 00:00 Tehran on the day containing `d`. */
export function startOfTehranDay(d: Date): Date {
  const p = tehranParts(d);
  return new Date(Date.UTC(p.y, p.m - 1, p.d) - TEHRAN_OFFSET_MIN * 60000);
}

const fmtDate = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone: TZ, year: "numeric", month: "long", day: "numeric" });
const fmtDateTime = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone: TZ, weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
const fmtTime = new Intl.DateTimeFormat("fa-IR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const fmtShort = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone: TZ, month: "numeric", day: "numeric" });
const fmtDateUTC = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" });

export const faDate = (d: Date) => fmtDate.format(d);
export const faDateTime = (d: Date) => fmtDateTime.format(d);
export const faTime = (d: Date) => fmtTime.format(d);
export const faShortDate = (d: Date) => fmtShort.format(d);
/** For @db.Date values. */
export const faDateOnly = (d: Date) => fmtDateUTC.format(d);

export function ageOn(birth: Date, on: Date = new Date()): number {
  let age = on.getUTCFullYear() - birth.getUTCFullYear();
  const m = on.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && on.getUTCDate() < birth.getUTCDate())) age--;
  return age;
}

export const faNum = (n: number | string) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
