import { db } from "@/server/db";
export const metadata = { title: "درباره ما" };

export default async function About() {
  const s = await db.academySetting.findUnique({ where: { id: 1 } });
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 leading-8">
      <h1 className="text-2xl font-bold">درباره {s?.academyName}</h1>
      <p className="mt-4 text-slate-600">
        آکادمی ما بر آموزش شنای رقابتی برای نوجوانان تمرکز دارد. برنامه‌های تمرینی بر اساس فصل، اهداف فصلی و مسابقات هدف طراحی می‌شوند و در هر چهار شنا — کرال سینه، کرال پشت، قورباغه و پروانه — تخصص‌محور هستند.
      </p>
      <p className="mt-4 text-slate-600">
        سلامت و امنیت ورزشکاران نوجوان اولویت ماست: اطلاعات شخصی فقط با رضایت سرپرست و با دسترسی محدود نگهداری می‌شود، ارتباط مربی با ورزشکاران زیر ۱۸ سال تحت نظارت والدین است و هیچ رژیم محدودکننده یا هدف کاهش وزن به‌طور پیش‌فرض فعال نیست.
      </p>
    </div>
  );
}
