"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays, CalendarRange, ChartColumn, Dumbbell, House, Inbox, LogOut, Menu, MessageSquare, Salad, Settings,
  ShieldCheck, Timer, UserRound, Users, UsersRound, Waves, X, type LucideIcon,
} from "lucide-react";
import type { IconKey, NavItem } from "./nav";

export const ICONS: Record<IconKey, LucideIcon> = {
  home: House, athletes: Users, groups: UsersRound, calendar: CalendarDays, reports: ChartColumn, water: Waves,
  dryland: Dumbbell, perf: Timer, nutrition: Salad, messages: MessageSquare, admin: Settings, guardians: ShieldCheck,
  seasons: CalendarRange, inquiries: Inbox, family: UserRound,
};

function isActive(pathname: string, href: string, all: NavItem[]) {
  if (href === "/app") return pathname === "/app";
  if (!(pathname === href || pathname.startsWith(href + "/"))) return false;
  // Prefer the most specific match (e.g. /app/admin/guardians over /app/admin).
  return !all.some((o) => o.href !== href && o.href.startsWith(href + "/") && (pathname === o.href || pathname.startsWith(o.href + "/")));
}

function grouped(items: NavItem[]) {
  const out: { section?: string; items: NavItem[] }[] = [];
  for (const i of items) {
    const g = out.find((x) => x.section === i.section);
    if (g) g.items.push(i);
    else out.push({ section: i.section, items: [i] });
  }
  return out;
}

export function Brand({ name, compact }: { name: string; compact?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span aria-hidden className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-500 to-pool-800 text-white shadow-md shadow-brand-950/20">
        <Waves className="size-5" strokeWidth={2.25} />
        <span className="absolute inset-x-0 bottom-0 h-0.5 bg-lane" />
      </span>
      {!compact && <span className="truncate text-[15px] font-extrabold tracking-tight text-ink">{name}</span>}
    </span>
  );
}

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="space-y-5">
      {grouped(items).map((g, gi) => (
        <div key={g.section ?? gi}>
          {g.section && <p className="mb-1.5 px-3 text-[11px] font-semibold text-slate-400">{g.section}</p>}
          <ul className="space-y-0.5">
            {g.items.map((i) => {
              const Icon = ICONS[i.icon];
              const active = isActive(pathname, i.href, items);
              return (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                      active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {active && <span aria-hidden className="absolute inset-y-2 start-0 w-[3px] rounded-full bg-brand-600" />}
                    <Icon aria-hidden className={`size-[18px] shrink-0 ${active ? "text-brand-600 dark:text-brand-400" : "text-slate-400 group-hover:text-slate-600"}`} strokeWidth={2} />
                    <span className="truncate">{i.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const t = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return (
    <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-xs font-bold text-brand-800 ring-2 ring-surface">
      {t}
    </span>
  );
}

function UserCard({ name, role, logout }: { name: string; role: string; logout: (fd: FormData) => void }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-2.5">
      <div className="flex items-center gap-2.5">
        <Initials name={name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{name}</p>
          <p className="truncate text-xs text-slate-500">{role}</p>
        </div>
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-1.5">
        <Link href="/app/account" className="btn-secondary btn-sm"><UserRound aria-hidden />حساب</Link>
        <form action={logout}>
          <button className="btn-sm btn w-full border border-rose-100 bg-surface text-rose-600 hover:bg-rose-50"><LogOut aria-hidden />خروج</button>
        </form>
      </div>
    </div>
  );
}

export function Sidebar({ items, name, role, academy, logout }: { items: NavItem[]; name: string; role: string; academy: string; logout: (fd: FormData) => void }) {
  return (
    <aside className="hidden w-64 shrink-0 border-e border-slate-200/80 bg-surface lg:block">
      <div className="sticky top-0 flex h-dvh flex-col">
        <Link href="/app" className="flex h-16 items-center px-5"><Brand name={academy} /></Link>
        <nav aria-label="منوی برنامه" className="flex-1 overflow-y-auto px-3 py-3">
          <NavLinks items={items} />
        </nav>
        <div className="p-3"><UserCard name={name} role={role} logout={logout} /></div>
      </div>
    </aside>
  );
}

export function MobileDrawer({ items, name, role, academy, logout }: { items: NavItem[]; name: string; role: string; academy: string; logout: (fd: FormData) => void }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost btn-sm size-9 px-0 lg:hidden" aria-label="باز کردن منو" aria-expanded={open}>
        <Menu aria-hidden className="!size-5" />
      </button>
      {mounted && createPortal(
      <div className={`fixed inset-0 z-50 transition-[visibility] duration-300 lg:hidden ${open ? "" : "pointer-events-none invisible"}`} aria-hidden={!open}>
        <div onClick={() => setOpen(false)} className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} />
        <div
          role="dialog" aria-modal="true" aria-label="منو"
          className={`absolute inset-y-0 start-0 flex w-[min(20rem,85vw)] flex-col bg-surface shadow-pop transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="flex h-16 items-center justify-between px-4">
            <Brand name={academy} />
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost btn-sm size-9 px-0" aria-label="بستن منو"><X aria-hidden className="!size-5" /></button>
          </div>
          <nav aria-label="منوی برنامه" className="flex-1 overflow-y-auto px-3 py-2"><NavLinks items={items} onNavigate={() => setOpen(false)} /></nav>
          <div className="p-3"><UserCard name={name} role={role} logout={logout} /></div>
        </div>
      </div>,
      document.body)}
    </>
  );
}

export function BottomTabs({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const tabs = items.filter((i) => i.mobile).slice(0, 5);
  return (
    <nav aria-label="میانبرها" className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map((i) => {
          const Icon = ICONS[i.icon];
          const active = isActive(pathname, i.href, items);
          return (
            <li key={i.href}>
              <Link href={i.href} aria-current={active ? "page" : undefined} className={`flex min-h-15 flex-col items-center justify-center gap-1 text-[11px] font-medium transition ${active ? "text-brand-700" : "text-slate-500"}`}>
                <span className={`grid h-7 w-12 place-items-center rounded-full transition ${active ? "bg-brand-100" : ""}`}>
                  <Icon aria-hidden className="size-5" strokeWidth={active ? 2.25 : 1.9} />
                </span>
                <span className="max-w-full truncate px-1">{i.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
