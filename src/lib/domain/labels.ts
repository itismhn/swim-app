export const ROLE_LABEL = {
  ADMIN: "مدیر آکادمی", HEAD_COACH: "سرمربی", COACH: "مربی گروه",
  NUTRITIONIST: "متخصص تغذیه", ATHLETE: "ورزشکار", GUARDIAN: "والد / سرپرست",
} as const;

export const STROKE_LABEL = {
  FREESTYLE: "کرال سینه", BACKSTROKE: "کرال پشت", BREASTSTROKE: "قورباغه",
  BUTTERFLY: "پروانه", IM: "مختلط", CHOICE: "انتخابی",
} as const;
export const MAIN_STROKES = ["FREESTYLE", "BACKSTROKE", "BREASTSTROKE", "BUTTERFLY"] as const;

export const MEMBERSHIP_LABEL = { ACTIVE: "فعال", PAUSED: "متوقف موقت", TRIAL: "آزمایشی", LEFT: "خارج‌شده" } as const;

export const ATTENDANCE_LABEL = {
  PRESENT: "حاضر", ABSENT: "غایب", EXCUSED: "غیبت موجه", LATE: "تأخیر", LEFT_EARLY: "خروج زودهنگام",
} as const;

export const SESSION_STATUS_LABEL = { SCHEDULED: "برنامه‌ریزی‌شده", COMPLETED: "برگزار شد", CANCELLED: "لغو شد" } as const;

export const PLAN_STATUS_LABEL = { DRAFT: "پیش‌نویس", PUBLISHED: "منتشرشده", ARCHIVED: "بایگانی" } as const;

export const SECTION_LABEL = {
  WARMUP: "گرم کردن", TECHNIQUE: "تکنیک و دریل", KICK_PULL: "پا / دست (کیک و پول)",
  MAIN: "ست اصلی", SKILLS: "مهارت‌ها: استارت، برگشت، زیرآبی", COOLDOWN: "سرد کردن",
} as const;
export const SECTION_ORDER = ["WARMUP", "TECHNIQUE", "KICK_PULL", "MAIN", "SKILLS", "COOLDOWN"] as const;

export const INTENSITY_LABEL = {
  EASY: "آسان", AEROBIC: "هوازی", THRESHOLD: "آستانه", VO2: "VO2 / حداکثر هوازی",
  SPRINT: "سرعت", RECOVERY: "ریکاوری", TECHNIQUE: "تمرکز تکنیکی",
} as const;

export const COURSE_LABEL = { SCM: "استخر ۲۵ متری", LCM: "استخر ۵۰ متری", SCY: "۲۵ یارد" } as const;
export const RESULT_TYPE_LABEL = { OFFICIAL: "مسابقه رسمی", PRACTICE_TEST: "تست تمرینی" } as const;
export const REQUEST_STATUS_LABEL = { OPEN: "باز", IN_PROGRESS: "در حال بررسی", ANSWERED: "پاسخ داده شد", CLOSED: "بسته" } as const;
export const LINK_STATUS_LABEL = { PENDING: "در انتظار تأیید", VERIFIED: "تأییدشده", REJECTED: "ردشده" } as const;

export const WEEKDAY_LABEL = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
/** JS getUTCDay() (0=Sunday) → Iranian weekday index (0=Saturday). */
export const jsDayToIran = (jsDay: number) => (jsDay + 1) % 7;
