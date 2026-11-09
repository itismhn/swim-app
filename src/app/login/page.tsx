import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarDays, ChartColumn, ShieldCheck, Timer } from "lucide-react";
import { ActionForm } from "@/components/ActionForm";
import { Field } from "@/components/ui";
import { getViewer } from "@/server/auth";
import { Brand } from "../app/AppNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { loginAction } from "./actions";

export const metadata = { title: "ورود" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getViewer()) redirect("/app");
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <Link href="/"><Brand name="آکادمی شنا" /></Link>
          <div className="flex items-center gap-2">
            <Link href="/" className="btn-ghost btn-sm"><ArrowRight aria-hidden />بازگشت به وب‌سایت</Link>
            <ThemeToggle />
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12 animate-fade-up">
          <h1 className="text-3xl font-extrabold tracking-tight">خوش آمدید</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">برای ورود به سامانه آکادمی، ایمیل و رمز عبور خود را وارد کنید.</p>
          <ActionForm action={loginAction} className="mt-8 space-y-4" submitLabel="ورود به سامانه" submitClassName="btn-primary h-12 w-full">
            <Field label="ایمیل" name="email" type="email" dir="ltr" autoComplete="email" placeholder="name@example.com" required />
            <Field label="رمز عبور" name="password" type="password" dir="ltr" autoComplete="current-password" required />
          </ActionForm>
          <p className="mt-6 text-center text-sm text-slate-500">
            هنوز عضو نیستید؟ <Link href="/register" className="link">درخواست ثبت‌نام</Link>
          </p>
          {process.env.NODE_ENV !== "production" && (
            <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-6 text-amber-900">
              <p className="font-semibold">حساب‌های نمونه (فقط محیط توسعه)</p>
              <p dir="ltr" className="text-start opacity-80">admin@ · head@ · coach1@ · coach2@ · nutrition@ · athlete1@ · parent1@ … example.com</p>
              <p className="opacity-80">رمز عبور: مقدار SEED_DEMO_PASSWORD در فایل ‎.env</p>
            </div>
          )}
        </div>
      </div>

      <aside aria-hidden className="relative isolate hidden overflow-hidden bg-brand-950 lg:block">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(50rem_30rem_at_20%_0%,rgb(19_143_192/.6),transparent),radial-gradient(40rem_30rem_at_100%_100%,rgb(47_171_217/.3),transparent)]" />
        <div className="absolute inset-0 -z-10 opacity-[0.07] [background-image:repeating-linear-gradient(90deg,#fff_0_2px,transparent_2px_110px)]" />
        <div className="flex h-full flex-col justify-end p-12 text-white">
          <div className="grid max-w-md gap-3">
            {[
              [Timer, "رکوردها و نمودار پیشرفت هر شناگر"],
              [CalendarDays, "تقویم جلسات و ثبت سریع حضور"],
              [ChartColumn, "گزارش‌های حضور و روند عملکرد گروه‌ها"],
              [ShieldCheck, "دسترسی نقش‌محور و حریم خصوصی نوجوانان"],
            ].map(([Icon, t], i) => {
              const I = Icon as typeof Timer;
              return (
                <div key={i} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5 backdrop-blur">
                  <span className="grid size-10 place-items-center rounded-xl bg-white/10"><I className="size-5 text-pool-200" /></span>
                  <p className="text-sm font-medium text-pool-50">{t as string}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-10 text-3xl font-extrabold leading-snug text-white">هر جلسه، یک قدم<br />به رکورد بعدی نزدیک‌تر.</p>
        </div>
      </aside>
    </div>
  );
}
