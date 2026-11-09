import Link from "next/link";
import { requireViewer } from "@/server/auth";
import { db } from "@/server/db";
import { ActionForm } from "@/components/ActionForm";
import { Badge, Empty, Field, PageHeader, Section } from "@/components/ui";
import { LINK_STATUS_LABEL } from "@/lib/domain/labels";
import { requestLink } from "./actions";

export const metadata = { title: "فرزندان من" };

export default async function Family() {
  const v = await requireViewer(["GUARDIAN"]);
  const links = await db.guardianLink.findMany({ where: { guardianId: v.id }, include: { athlete: { select: { id: true, user: { select: { name: true } } } } } });
  return (
    <>
      <PageHeader title="فرزندان من" subtitle="فقط ورزشکارانی که رابطه سرپرستی آن‌ها توسط آکادمی تأیید شده است قابل مشاهده‌اند." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="ورزشکاران مرتبط">
          {links.length === 0 ? <Empty title="هنوز ورزشکاری به حساب شما متصل نیست" /> : (
            <ul className="space-y-2">
              {links.map((l) => (
                <li key={l.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
                  {l.status === "VERIFIED" ? <Link href={`/app/athletes/${l.athlete.id}`} className="link font-medium">{l.athlete.user.name}</Link> : <span className="text-slate-500">درخواست اتصال ({l.relation})</span>}
                  <Badge tone={l.status === "VERIFIED" ? "green" : l.status === "PENDING" ? "amber" : "red"}>{LINK_STATUS_LABEL[l.status]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="درخواست اتصال به ورزشکار">
          <ActionForm action={requestLink} className="space-y-3" resetOnSuccess submitLabel="ارسال درخواست">
            <Field label="نام کامل ورزشکار (همان‌طور که در آکادمی ثبت شده)" name="athleteName" />
            <Field label="تاریخ تولد (شمسی)" name="birthDate" placeholder="۱۳۹۰/۰۵/۱۲" dir="ltr" />
            <Field label="نسبت" name="relation" placeholder="پدر، مادر، قیم…" />
          </ActionForm>
        </Section>
      </div>
    </>
  );
}
