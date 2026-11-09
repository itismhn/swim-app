import Link from "next/link";
import { db } from "@/server/db";
export const metadata = { title: "تماس با ما" };

export default async function Contact() {
  const s = await db.academySetting.findUnique({ where: { id: 1 } });
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold">تماس با ما</h1>
      <dl className="card mt-6 grid gap-4 sm:grid-cols-[8rem_1fr]">
        <dt className="text-slate-500">تلفن</dt><dd>{s?.contactPhone ?? "—"}</dd>
        <dt className="text-slate-500">ایمیل</dt><dd dir="ltr" className="text-end">{s?.contactEmail ?? "—"}</dd>
        <dt className="text-slate-500">نشانی</dt><dd>{s?.contactAddress ?? "—"}</dd>
      </dl>
      <p className="mt-6 text-sm text-slate-600">برای ثبت‌نام یا مشاوره اولیه از <Link href="/register" className="link">فرم درخواست</Link> استفاده کنید.</p>
    </div>
  );
}
