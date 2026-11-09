import Link from "next/link";
import { requireViewer } from "@/server/auth";
import { PageHeader } from "@/components/ui";

const links = [
  ["/app/admin/users", "کاربران و نقش‌ها", "ساخت حساب مربی، متخصص تغذیه و سرپرست؛ غیرفعال‌سازی؛ تغییر نقش"],
  ["/app/admin/guardians", "تأیید سرپرستان", "بررسی درخواست‌های اتصال والدین به ورزشکاران"],
  ["/app/groups", "گروه‌ها و زمان‌بندی", "ساخت گروه، تعیین مربی، محل و برنامه هفتگی"],
  ["/app/admin/seasons", "فصل‌ها، نقاط عطف و مسابقات", "اهداف فصلی، هفته‌های ۸ و ۱۶، مسابقات هدف"],
  ["/app/admin/settings", "تنظیمات آکادمی", "طول استخر، تعداد و مدت جلسات، نظارت والدین"],
  ["/app/admin/inquiries", "درخواست‌های ثبت‌نام و مشاوره", "فرم‌های ارسالی وب‌سایت عمومی"],
  ["/app/admin/content", "محتوای وب‌سایت عمومی", "مربیان، برنامه‌ها و سؤالات متداول"],
  ["/app/admin/audit", "گزارش ممیزی", "سابقه تغییرات حساس"],
] as const;

export default async function Admin() {
  await requireViewer(["ADMIN"]);
  return (
    <>
      <PageHeader title="مدیریت آکادمی" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map(([href, t, d]) => (
          <Link key={href} href={href} className="card hover:border-brand-200"><p className="font-bold">{t}</p><p className="mt-1 text-sm text-slate-500">{d}</p></Link>
        ))}
      </div>
    </>
  );
}
