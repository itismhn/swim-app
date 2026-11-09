"use client";
import { RefreshCw, WifiOff } from "lucide-react";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card mx-auto max-w-md py-10 text-center">
      <span aria-hidden className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100"><WifiOff className="size-6" /></span>
      <p className="text-lg font-bold text-ink">خطایی در بارگذاری این صفحه رخ داد.</p>
      <p className="mt-1.5 text-sm text-slate-500">اتصال خود را بررسی کنید و دوباره تلاش کنید.</p>
      <button onClick={reset} className="btn-primary mt-6"><RefreshCw aria-hidden />تلاش دوباره</button>
    </div>
  );
}
