import Link from "next/link";
import { Bell } from "lucide-react";
import { requireViewer } from "@/server/auth";
import { db } from "@/server/db";
import { ROLE_LABEL } from "@/lib/domain/labels";
import { faNum } from "@/lib/domain/jalali";
import { navFor } from "./nav";
import { BottomTabs, Brand, MobileDrawer, Sidebar } from "./AppNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { logoutAction } from "../login/actions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const v = await requireViewer();
  const [unread, settings] = await Promise.all([
    db.notification.count({ where: { userId: v.id, readAt: null } }),
    db.academySetting.findUnique({ where: { id: 1 }, select: { academyName: true } }),
  ]);
  const items = navFor(v.role);
  const academy = settings?.academyName ?? "آکادمی شنا";
  const role = ROLE_LABEL[v.role];
  const today = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone: "Asia/Tehran", dateStyle: "full" }).format(new Date());
  return (
    <div className="min-h-dvh pb-24 lg:flex lg:pb-0">
      <a href="#main" className="sr-only z-50 rounded-lg bg-surface px-3 py-2 focus:not-sr-only focus:fixed focus:start-3 focus:top-3">پرش به محتوا</a>
      <Sidebar items={items} name={v.name} role={role} academy={academy} logout={logoutAction} />

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-canvas/80 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 md:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <MobileDrawer items={items} name={v.name} role={role} academy={academy} logout={logoutAction} />
              <Link href="/app" className="min-w-0 lg:hidden"><Brand name={academy} /></Link>
              <p className="hidden text-sm text-slate-500 lg:block">{today}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <Link
              href="/app/notifications"
              className="btn-secondary btn-sm relative size-10 rounded-xl px-0"
              aria-label={unread > 0 ? `اعلان‌ها، ${faNum(unread)} خوانده‌نشده` : "اعلان‌ها"}
            >
              <Bell aria-hidden className="!size-[18px]" />
              {unread > 0 && (
                <span className="nums absolute -top-1.5 -end-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white ring-2 ring-canvas">
                  {unread > 99 ? "۹۹+" : faNum(unread)}
                </span>
              )}
            </Link>
            </div>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">{children}</main>
      </div>

      <BottomTabs items={items} />
    </div>
  );
}
