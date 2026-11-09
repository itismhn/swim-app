"use client";
export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card text-center">
      <p className="font-bold text-rose-700">خطایی در بارگذاری این صفحه رخ داد.</p>
      <p className="mt-1 text-sm text-slate-500">اتصال خود را بررسی کنید و دوباره تلاش کنید.</p>
      <button onClick={reset} className="btn-primary mt-4">تلاش دوباره</button>
    </div>
  );
}
