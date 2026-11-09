import { requireViewer } from "@/server/auth";
import { db } from "@/server/db";
import { ActionForm } from "@/components/ActionForm";
import { Field, PageHeader, Section } from "@/components/ui";
import { ROLE_LABEL } from "@/lib/domain/labels";
import { faDateTime, faNum } from "@/lib/domain/jalali";
import { changePassword, signOutOthers } from "./actions";

export const metadata = { title: "حساب کاربری" };

export default async function Account() {
  const v = await requireViewer();
  const [user, sessions] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: v.id }, select: { email: true, phone: true } }),
    db.session.findMany({ where: { userId: v.id, expiresAt: { gt: new Date() } }, select: { createdAt: true, userAgent: true }, orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <>
      <PageHeader title="حساب کاربری" subtitle={`${v.name} · ${ROLE_LABEL[v.role]}`} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="تغییر رمز عبور">
          <ActionForm action={changePassword} className="space-y-3" resetOnSuccess submitLabel="تغییر رمز">
            <Field label="رمز فعلی" name="current" type="password" dir="ltr" />
            <Field label="رمز جدید" name="next" type="password" dir="ltr" hint="حداقل ۱۰ کاراکتر. از عبارت بلند و یکتا استفاده کنید." />
            <Field label="تکرار رمز جدید" name="confirm" type="password" dir="ltr" />
          </ActionForm>
          <p className="mt-3 text-xs text-slate-500">رمز فراموش شده؟ بازیابی ایمیلی هنوز فعال نیست؛ از مدیر آکادمی بخواهید رمز را بازنشانی کند.</p>
        </Section>
        <Section title={`نشست‌های فعال (${faNum(sessions.length)})`}>
          <p className="mb-2 text-sm"><span className="text-slate-500">ایمیل ورود: </span><span dir="ltr">{user.email}</span></p>
          <ul className="space-y-1 text-xs text-slate-600">
            {sessions.map((s, i) => <li key={i} className="truncate" dir="ltr">{faDateTime(s.createdAt)} — {s.userAgent ?? "?"}</li>)}
          </ul>
          {sessions.length > 1 && (
            <ActionForm action={async () => { "use server"; return signOutOthers(); }} className="mt-3" submitLabel="خروج از سایر دستگاه‌ها" submitClassName="btn-secondary btn-sm">
              <span />
            </ActionForm>
          )}
        </Section>
      </div>
    </>
  );
}
