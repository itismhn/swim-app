import Link from "next/link";
export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center p-4 text-center">
      <div><p className="text-xl font-bold">صفحه یافت نشد</p><Link href="/" className="link mt-3 block">صفحه اصلی</Link></div>
    </div>
  );
}
