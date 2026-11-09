import type { Role } from "@prisma/client";

export type IconKey =
  | "home" | "athletes" | "groups" | "calendar" | "reports" | "water" | "dryland" | "perf"
  | "nutrition" | "messages" | "admin" | "guardians" | "seasons" | "inquiries" | "family";

export interface NavItem { href: string; label: string; icon: IconKey; mobile?: boolean; section?: string }

const I = {
  home: "home", athletes: "athletes", groups: "groups", calendar: "calendar", reports: "reports", water: "water", dryland: "dryland", perf: "perf",
  nutrition: "nutrition", messages: "messages", admin: "admin",
} as const satisfies Record<string, IconKey>;

export function navFor(role: Role): NavItem[] {
  return rawNav(role).map((i) => ({ ...i, section: sectionOf(i.href) }));
}

function sectionOf(href: string) {
  if (href === "/app") return undefined;
  if (href === "/app/messages") return "ارتباطات";
  if (href.startsWith("/app/admin")) return "مدیریت";
  if (["/app/workouts", "/app/dryland", "/app/performance", "/app/nutrition"].includes(href)) return "تمرین و عملکرد";
  return "آکادمی";
}

function rawNav(role: Role): NavItem[] {
  const home: NavItem = { href: "/app", label: "داشبورد", icon: I.home, mobile: true };
  const msg: NavItem = { href: "/app/messages", label: "پیام‌ها", icon: I.messages, mobile: true };
  switch (role) {
    case "ADMIN":
    case "HEAD_COACH":
    case "COACH":
      return [
        home,
        { href: "/app/calendar", label: "جلسات و حضور", icon: I.calendar, mobile: true },
        { href: "/app/athletes", label: "ورزشکاران", icon: I.athletes, mobile: true },
        { href: "/app/groups", label: "گروه‌ها", icon: I.groups },
        { href: "/app/workouts", label: "تمرین در آب", icon: I.water, mobile: true },
        { href: "/app/dryland", label: "تمرین خشکی", icon: I.dryland },
        { href: "/app/performance", label: "رکوردها", icon: I.perf },
        { href: "/app/reports", label: "گزارش حضور", icon: I.reports },
        msg,
        ...(role === "ADMIN" ? [{ href: "/app/admin", label: "مدیریت", icon: I.admin }] : []),
        ...(role === "HEAD_COACH"
          ? [
              { href: "/app/admin/guardians", label: "تأیید سرپرستان", icon: "guardians" as const },
              { href: "/app/admin/seasons", label: "فصل‌ها", icon: "seasons" as const },
              { href: "/app/admin/inquiries", label: "درخواست‌های ثبت‌نام", icon: "inquiries" as const },
            ]
          : []),
      ];
    case "NUTRITIONIST":
      return [home, { href: "/app/nutrition", label: "درخواست‌های تغذیه", icon: I.nutrition, mobile: true }, msg];
    case "ATHLETE":
    case "GUARDIAN":
      return [
        home,
        { href: "/app/workouts", label: "برنامه‌ها", icon: I.water, mobile: true },
        { href: "/app/dryland", label: "تمرین خشکی", icon: I.dryland },
        { href: "/app/calendar", label: "جلسات", icon: I.calendar },
        { href: "/app/performance", label: "رکوردها", icon: I.perf, mobile: true },
        { href: "/app/nutrition", label: "تغذیه", icon: I.nutrition },
        ...(role === "GUARDIAN" ? [{ href: "/app/family", label: "فرزندان من", icon: "family" as const }] : []),
        { href: "/app/reports", label: "گزارش حضور", icon: I.reports },
        msg,
      ];
  }
}
