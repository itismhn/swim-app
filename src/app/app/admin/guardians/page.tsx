import { requireViewer } from "@/server/auth";
import { db } from "@/server/db";
import { ActionForm } from "@/components/ActionForm";
import { Badge, Empty, Field, PageHeader, Section } from "@/components/ui";
import { LINK_STATUS_LABEL } from "@/lib/domain/labels";
import { dateOnlyToJalaliString, faDateTime } from "@/lib/domain/jalali";
import { createLink, decideLink } from "../actions";

export const metadata = { title: "تأیید سرپرستان" };

export default async function Guardians() {
  await requireViewer(["ADMIN", "HEAD_COACH"]);
  const [links, guardians, athletes] = await Promise.all([
    db.guardianLink.findMany({
      include: { guardian: { select: { name: true, phone: true, email: true } }, athlete: { select: { birthDate: true, user: { select: { name: true } } } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    db.user.findMany({ where: { role: "GUARDIAN", active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.athlete.findMany({ select: { id: true, user: { select: { name: true } } }, orderBy: { user: { name: "asc" } } }),
  ]);
  const pending = links.filter((l) => l.status === "PENDING");
  return (
    <>
      <PageHeader title="تأیید رابطه سرپرستی" subtitle="سرپرست فقط پس از تأیید، به اطلاعات ورزشکار دسترسی پیدا می‌کند. هویت را حضوری یا تلفنی بررسی کنید." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="در انتظار تأیید">
          {pending.length === 0 ? <Empty title="درخواست در انتظاری نیست" /> : (
            <ul className="space-y-2">
              {pending.map((l) => (
                <li key={l.id} className="rounded-xl border border-amber-200 bg-amber-50/40 p-3 text-sm">
                  <p><b>{l.guardian.name}</b> ({l.relation}) ← {l.athlete.user.name} · تولد {dateOnlyToJalaliString(l.athlete.birthDate)}</p>
                  <p className="text-xs text-slate-500" dir="ltr">{l.guardian.phone} · {l.guardian.email}</p>
                  <p className="text-xs text-slate-500">{faDateTime(l.createdAt)}</p>
                  <div className="mt-2 flex gap-2">
                    <form action={async () => { "use server"; await decideLink(l.id, "VERIFIED"); }}><button className="btn-primary btn-sm">تأیید</button></form>
                    <form action={async () => { "use server"; await decideLink(l.id, "REJECTED"); }}><button className="btn-danger btn-sm">رد</button></form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="اتصال مستقیم (پس از احراز هویت حضوری)">
          <ActionForm action={createLink} className="space-y-3" submitLabel="ثبت و تأیید">
            <Field label="سرپرست" name="guardianId" as="select">{guardians.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</Field>
            <Field label="ورزشکار" name="athleteId" as="select">{athletes.map((a) => <option key={a.id} value={a.id}>{a.user.name}</option>)}</Field>
            <Field label="نسبت" name="relation" />
          </ActionForm>
        </Section>
      </div>
      <div className="mt-4">
        <Section title="همه اتصال‌ها">
          <ul className="divide-y divide-slate-100 text-sm">
            {links.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-2 py-2">
                <span>{l.guardian.name} ← {l.athlete.user.name}</span>
                <span className="flex items-center gap-2">
                  <Badge tone={l.status === "VERIFIED" ? "green" : l.status === "PENDING" ? "amber" : "red"}>{LINK_STATUS_LABEL[l.status]}</Badge>
                  {l.status === "VERIFIED" && <form action={async () => { "use server"; await decideLink(l.id, "REJECTED"); }}><button className="text-xs text-rose-600">لغو دسترسی</button></form>}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </>
  );
}
