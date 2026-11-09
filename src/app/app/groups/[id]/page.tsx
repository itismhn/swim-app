import Link from "next/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/server/auth";
import { db } from "@/server/db";
import { groupWhere } from "@/server/authz";
import { STAFF } from "@/server/viewer";
import { ActionForm } from "@/components/ActionForm";
import { Badge, Field, PageHeader, Section } from "@/components/ui";
import { MEMBERSHIP_LABEL, WEEKDAY_LABEL } from "@/lib/domain/labels";
import { faNum } from "@/lib/domain/jalali";
import { addSlot, generateSessions, removeSlot, setGroupCoach, updateGroup } from "../actions";

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const v = await requireViewer(STAFF);
  const { id } = await params;
  const g = await db.group.findFirst({
    where: { AND: [{ id }, groupWhere(v)] },
    include: {
      coaches: { include: { user: { select: { id: true, name: true } } } },
      slots: { orderBy: [{ weekday: "asc" }, { startTime: "asc" }] },
      athletes: { include: { user: { select: { name: true } } }, orderBy: { user: { name: "asc" } } },
    },
  });
  if (!g) notFound();
  const isAdmin = v.role === "ADMIN";
  const coaches = isAdmin ? await db.user.findMany({ where: { role: { in: ["COACH", "HEAD_COACH"] }, active: true }, select: { id: true, name: true } }) : [];

  return (
    <>
      <PageHeader title={g.name} subtitle={`${g.level ?? ""} · ${g.location ?? ""}`} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title={`ورزشکاران (${faNum(g.athletes.length)})`}>
          <ul className="divide-y divide-slate-100 text-sm">
            {g.athletes.map((a) => (
              <li key={a.id} className="flex justify-between py-2"><Link href={`/app/athletes/${a.id}`} className="link">{a.user.name}</Link><Badge>{MEMBERSHIP_LABEL[a.status]}</Badge></li>
            ))}
          </ul>
        </Section>
        <Section title="زمان‌بندی هفتگی">
          <ul className="space-y-1 text-sm">
            {g.slots.map((s) => (
              <li key={s.id} className="flex items-center justify-between">
                <span>{WEEKDAY_LABEL[s.weekday]} ساعت {faNum(s.startTime)} — {faNum(s.minutes)} دقیقه</span>
                {isAdmin && <form action={async () => { "use server"; await removeSlot(s.id); }}><button className="text-xs text-rose-600">حذف</button></form>}
              </li>
            ))}
          </ul>
          {isAdmin && (
            <ActionForm action={addSlot.bind(null, g.id)} className="mt-3 grid grid-cols-2 gap-2" submitLabel="افزودن زمان" submitClassName="btn-secondary btn-sm">
              <Field label="روز" name="weekday" as="select">{WEEKDAY_LABEL.map((l, i) => <option key={i} value={i}>{l}</option>)}</Field>
              <Field label="ساعت شروع" name="startTime" placeholder="16:00" dir="ltr" />
              <Field label="مدت (دقیقه)" name="minutes" inputMode="numeric" hint="خالی = پیش‌فرض آکادمی" />
            </ActionForm>
          )}
          <ActionForm action={generateSessions.bind(null, g.id)} className="mt-4 flex items-end gap-2 border-t border-slate-100 pt-3" submitLabel="ساخت جلسات" submitClassName="btn-primary btn-sm">
            <Field label="ساخت جلسات برای چند هفته آینده" name="weeks" defaultValue={4} inputMode="numeric" />
          </ActionForm>
        </Section>
        <Section title="مربیان">
          <ul className="space-y-1 text-sm">
            {g.coaches.map((c) => (
              <li key={c.userId} className="flex items-center justify-between">
                {c.user.name}
                {isAdmin && <ActionForm action={setGroupCoach.bind(null, g.id)}><input type="hidden" name="userId" value={c.userId} /><input type="hidden" name="op" value="remove" /><button className="text-xs text-rose-600">حذف</button></ActionForm>}
              </li>
            ))}
          </ul>
          {isAdmin && (
            <ActionForm action={setGroupCoach.bind(null, g.id)} className="mt-3 flex items-end gap-2" submitLabel="افزودن" submitClassName="btn-secondary btn-sm">
              <input type="hidden" name="op" value="add" />
              <Field label="افزودن مربی" name="userId" as="select">{coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Field>
            </ActionForm>
          )}
        </Section>
        {isAdmin && (
          <Section title="ویرایش گروه">
            <ActionForm action={updateGroup.bind(null, g.id)} className="grid gap-3" submitLabel="ذخیره">
              <Field label="نام" name="name" defaultValue={g.name} />
              <Field label="سطح" name="level" defaultValue={g.level} />
              <Field label="محل تمرین" name="location" defaultValue={g.location} />
              <Field label="توضیحات" name="description" defaultValue={g.description} />
            </ActionForm>
          </Section>
        )}
      </div>
    </>
  );
}
