import { requireViewer } from "@/server/auth";
import { db } from "@/server/db";
import { externalChannelsStatus } from "@/server/notify-external";
import { ActionForm } from "@/components/ActionForm";
import { Badge, Field, PageHeader, Section } from "@/components/ui";
import { saveSettings } from "../actions";

export const metadata = { title: "تنظیمات" };

export default async function Settings() {
  await requireViewer(["ADMIN"]);
  const s = await db.academySetting.findUnique({ where: { id: 1 } });
  const ext = externalChannelsStatus();
  return (
    <>
      <PageHeader title="تنظیمات آکادمی" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActionForm action={saveSettings} className="card grid gap-4 sm:grid-cols-2" submitLabel="ذخیره تنظیمات">
            <Field label="نام آکادمی" name="academyName" defaultValue={s?.academyName} />
            <Field label="طول استخر پیش‌فرض (متر)" name="poolLengthMeters" as="select" defaultValue={String(s?.poolLengthMeters ?? 25)}><option value="25">۲۵</option><option value="50">۵۰</option></Field>
            <Field label="جلسات در هفته" name="sessionsPerWeek" defaultValue={s?.sessionsPerWeek ?? 3} inputMode="numeric" />
            <Field label="مدت هر جلسه (دقیقه)" name="sessionMinutes" defaultValue={s?.sessionMinutes ?? 120} inputMode="numeric" />
            <label className="flex items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" name="guardianOversightMinors" defaultChecked={s?.guardianOversightMinors ?? true} className="mt-1" />
              <span>نظارت سرپرست بر گفتگوهای ورزشکاران زیر ۱۸ سال (سرپرستان تأییدشده به‌طور خودکار عضو گفتگو می‌شوند)</span></label>
            <label className="flex items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" name="countExcusedAsAbsent" defaultChecked={s?.countExcusedAsAbsent ?? false} className="mt-1" />
              <span>غیبت موجه در محاسبه نرخ حضور به‌عنوان غیبت شمرده شود (پیش‌فرض: خیر، از مخرج حذف می‌شود)</span></label>
            <Field label="تلفن تماس" name="contactPhone" defaultValue={s?.contactPhone} />
            <Field label="ایمیل تماس" name="contactEmail" defaultValue={s?.contactEmail} dir="ltr" />
            <div className="sm:col-span-2"><Field label="نشانی" name="contactAddress" defaultValue={s?.contactAddress} /></div>
          </ActionForm>
        </div>
        <Section title="سرویس‌های خارجی">
          <ul className="space-y-3 text-sm">
            <li><Badge tone="red">پیکربندی نشده</Badge> پیامک — {ext.sms.reason}</li>
            <li><Badge tone="red">پیکربندی نشده</Badge> ایمیل — {ext.email.reason}</li>
          </ul>
          <p className="mt-3 text-xs text-slate-500">در حال حاضر همه اعلان‌ها فقط داخل سامانه ارسال می‌شوند.</p>
        </Section>
      </div>
    </>
  );
}
