import Link from "next/link";
export default function NotFound() {
  return (
    <div className="card text-center">
      <p className="font-bold">موردی یافت نشد</p>
      <p className="mt-1 text-sm text-slate-500">این مورد وجود ندارد یا شما به آن دسترسی ندارید.</p>
      <Link href="/app" className="btn-secondary mt-4">بازگشت به داشبورد</Link>
    </div>
  );
}
