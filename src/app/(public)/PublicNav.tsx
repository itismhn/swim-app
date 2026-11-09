"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { PUBLIC_NAV } from "./shared";



export function PublicNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  return (
    <>
      <nav aria-label="منوی اصلی" className="hidden items-center gap-1 rounded-full border border-slate-200/80 bg-surface/70 p-1 text-sm shadow-sm md:flex">
        {PUBLIC_NAV.map(([href, label]) => (
          <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 font-medium transition ${active(href) ? "bg-brand-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
            {label}
          </Link>
        ))}
      </nav>
      <button type="button" onClick={() => setOpen((o) => !o)} className="btn-ghost btn-sm size-10 px-0 md:hidden" aria-label={open ? "بستن منو" : "باز کردن منو"} aria-expanded={open} aria-controls="public-mobile-nav">
        {open ? <X aria-hidden className="!size-5" /> : <Menu aria-hidden className="!size-5" />}
      </button>
      {open && (
        <nav id="public-mobile-nav" aria-label="منوی اصلی موبایل" className="absolute inset-x-3 top-full mt-2 rounded-2xl border border-slate-200 bg-surface p-2 shadow-pop animate-fade-up md:hidden">
          {PUBLIC_NAV.map(([href, label]) => (
            <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}
              className={`block rounded-xl px-4 py-3 text-sm font-medium ${active(href) ? "bg-brand-50 text-brand-700" : "text-slate-700 hover:bg-slate-50"}`}>
              {label}
            </Link>
          ))}
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-100 p-2 pt-3">
            <Link href="/login" className="btn-secondary">ورود</Link>
            <Link href="/register" className="btn-primary">ثبت‌نام</Link>
          </div>
        </nav>
      )}
    </>
  );
}
