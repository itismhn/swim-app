import Link from "next/link";
import { requireViewer } from "@/server/auth";
import { db } from "@/server/db";
import { ROLE_LABEL } from "@/lib/domain/labels";
import { faNum } from "@/lib/domain/jalali";
import { navFor } from "./nav";
import { logoutAction } from "../login/actions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const v = await requireViewer();
  const unread = await db.notification.count({ where: { userId: v.id, readAt: null } });
  const items = navFor(v.role);
  return (
    <div className="min-h-dvh pb-20 md:flex md:pb-0">
      <aside className="hidden w-60 shrink-0 border-e border-slate-200 bg-white md:block">
        <div className="sticky top-0 flex h-dvh flex-col p-4">
          <Link href="/app" className="mb-6 flex items-center gap-2 font-bold text-brand-700">
            <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-brand-600 text-white">〰</span> آکادمی شنا
          </Link>
          <nav aria-label="منوی برنامه" className="flex flex-1 flex-col gap-1 overflow-y-auto">
            {items.map((i) => (
              <Link key={i.href} href={i.href} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-brand-50">
                <span aria-hidden className="w-5 text-center">{i.icon}</span>{i.label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-slate-100 pt-3 text-sm">
            <p className="font-medium">{v.name}</p>
            <p className="text-xs text-slate-500">{ROLE_LABEL[v.role]}</p>
            <div className="mt-2 flex gap-3 text-xs">
              <Link href="/app/account" className="text-brand-600">حساب کاربری</Link>
              <form action={logoutAction}><button className="text-rose-600">خروج</button></form>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-slate-200 bg-white/90 px-4 py-2 backdrop-blur">
          <div className="text-sm md:hidden">
            <p className="font-medium">{v.name}</p>
            <p className="text-xs text-slate-500">{ROLE_LABEL[v.role]}</p>
          </div>
          <div className="hidden text-sm text-slate-500 md:block">{new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone: "Asia/Tehran", dateStyle: "full" }).format(new Date())}</div>
          <div className="flex items-center gap-2">
            <Link href="/app/notifications" className="btn-secondary btn-sm relative" aria-label={`اعلان‌ها، ${unread} خوانده‌نشده`}>
              🔔 اعلان‌ها
              {unread > 0 && <span className="absolute -top-1 -start-1 grid min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] text-white">{faNum(unread)}</span>}
            </Link>
            <details className="relative md:hidden">
              <summary className="btn-secondary btn-sm list-none">☰ منو</summary>
              <nav className="absolute end-0 z-30 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                {items.map((i) => <Link key={i.href} href={i.href} className="block rounded-lg px-3 py-2 text-sm hover:bg-brand-50">{i.icon} {i.label}</Link>)}
                <Link href="/app/account" className="block rounded-lg px-3 py-2 text-sm hover:bg-brand-50">👤 حساب کاربری</Link>
                <form action={logoutAction}><button className="w-full rounded-lg px-3 py-2 text-start text-sm text-rose-600">خروج</button></form>
              </nav>
            </details>
          </div>
        </header>
        <main className="mx-auto max-w-6xl p-4 md:p-6">{children}</main>
      </div>

      <nav aria-label="میانبرها" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-slate-200 bg-white md:hidden">
        {items.filter((i) => i.mobile).slice(0, 5).map((i) => (
          <Link key={i.href} href={i.href} className="flex min-h-14 flex-col items-center justify-center text-[11px] text-slate-600">
            <span aria-hidden className="text-lg">{i.icon}</span>{i.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
