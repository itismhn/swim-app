import Link from "next/link";
import { ArrowRight, LifeBuoy } from "lucide-react";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center p-4 text-center">
      <div className="animate-fade-up">
        <span aria-hidden className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:text-brand-400 ring-1 ring-brand-100"><LifeBuoy className="size-8" /></span>
        <p className="nums text-5xl font-extrabold text-ink">۴۰۴</p>
        <p className="mt-2 text-lg font-bold text-ink">صفحه یافت نشد</p>
        <p className="mt-1 text-sm text-slate-500">ممکن است نشانی اشتباه باشد یا صفحه جابه‌جا شده باشد.</p>
        <Link href="/" className="btn-primary mt-6"><ArrowRight aria-hidden />صفحه اصلی</Link>
      </div>
    </div>
  );
}
