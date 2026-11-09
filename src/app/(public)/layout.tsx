import Link from "next/link";
import { Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { db } from "@/server/db";
import { Brand } from "../app/AppNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PublicNav } from "./PublicNav";
import { PUBLIC_NAV } from "./shared";

export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const s = await db.academySetting.findUnique({ where: { id: 1 } });
  const name = s?.academyName ?? "آکادمی شنا";
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-canvas/75 backdrop-blur-xl">
        <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <Link href="/" aria-label={`${name} — خانه`} className="min-w-0"><Brand name={name} /></Link>
          <div className="flex shrink-0 items-center gap-2 md:contents">
            <ThemeToggle className="md:order-last" />
            <PublicNav />
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <Link href="/login" className="btn-ghost btn-sm">ورود</Link>
            <Link href="/register" className="btn-primary btn-sm">درخواست ثبت‌نام</Link>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mt-16 border-t border-slate-200 bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Brand name={name} />
            <p className="mt-4 max-w-sm text-sm leading-7 text-slate-500">
              آموزش شنای رقابتی برای نوجوانان؛ برنامه‌ریزی فصلی، پایش عملکرد و ارتباط شفاف بین مربی، ورزشکار و خانواده.
            </p>
          </div>
          <div>
            <p className="text-sm font-bold text-ink">صفحات</p>
            <ul className="mt-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-1">
              {PUBLIC_NAV.map(([href, label]) => <li key={href}><Link href={href} className="text-slate-500 transition hover:text-brand-600 dark:text-brand-400">{label}</Link></li>)}
            </ul>
          </div>
          <div>
            <p className="text-sm font-bold text-ink">ارتباط با ما</p>
            <ul className="mt-3 space-y-2.5 text-sm text-slate-500">
              {s?.contactPhone && <li className="flex items-center gap-2"><Phone aria-hidden className="size-4 text-slate-400" /><span dir="ltr">{s.contactPhone}</span></li>}
              {s?.contactEmail && <li className="flex items-center gap-2"><Mail aria-hidden className="size-4 text-slate-400" /><span dir="ltr">{s.contactEmail}</span></li>}
              {s?.contactAddress && <li className="flex items-start gap-2"><MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-slate-400" />{s.contactAddress}</li>}
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-100">
          <p className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-4 text-xs text-slate-400">
            <ShieldCheck aria-hidden className="size-4 shrink-0" />
            محتوای این وب‌سایت عمومی است و هیچ اطلاعات خصوصی ورزشکاران در آن نمایش داده نمی‌شود.
          </p>
        </div>
      </footer>
    </div>
  );
}
