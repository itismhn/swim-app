import { Plus, Target } from "lucide-react";
import { requireViewer } from "@/server/auth";
import { db } from "@/server/db";
import { ActionForm, FieldError } from "@/components/ActionForm";
import { Badge, Field, PageHeader, Section } from "@/components/ui";
import { COURSE_LABEL } from "@/lib/domain/labels";
import { dateOnlyToJalaliString, faNum } from "@/lib/domain/jalali";
import { activateSeason, addCompetition, createSeason, saveMilestone } from "../actions";

export const metadata = { title: "فصل‌ها" };

export default async function Seasons() {
  const v = await requireViewer(["ADMIN", "HEAD_COACH"]);
  const seasons = await db.season.findMany({
    include: { milestones: { orderBy: { week: "asc" } }, competitions: { orderBy: { date: "asc" } } },
    orderBy: { startDate: "desc" },
  });
  const admin = v.role === "ADMIN";
  return (
    <>
      <PageHeader title="فصل‌ها، نقاط عطف و مسابقات هدف" />
      <div className="space-y-4">
        {seasons.map((s) => (
          <Section key={s.id} title={s.name} actions={s.active ? <Badge tone="green">فصل فعال</Badge> : admin && <form action={async () => { "use server"; await activateSeason(s.id); }}><button className="btn-secondary btn-sm">فعال‌سازی</button></form>}>
            <p className="text-sm text-slate-600">{dateOnlyToJalaliString(s.startDate)} تا {dateOnlyToJalaliString(s.endDate)}</p>
            {s.goals && <p className="mt-1 text-sm"><Target aria-hidden className="inline size-3.5 shrink-0 align-[-2px]" /> {s.goals}</p>}
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-bold">نقاط عطف (قابل ویرایش)</h3>
                <ul className="space-y-2">
                  {s.milestones.map((m) => (
                    <li key={m.id}>
                      <ActionForm action={saveMilestone.bind(null, s.id, m.id)} className="grid grid-cols-[4rem_1fr] gap-2 rounded-xl border border-slate-100 p-2" submitLabel="ذخیره" submitClassName="btn-secondary btn-sm">
                        <input name="week" defaultValue={m.week} className="input" inputMode="numeric" aria-label="هفته" />
                        <input name="title" defaultValue={m.title} className="input" aria-label="عنوان" />
                        <input name="description" defaultValue={m.description ?? ""} className="input col-span-2" placeholder="توضیح" aria-label="توضیح" />
                        <FieldError name="week" className="col-span-2" /><FieldError name="title" className="col-span-2" />
                      </ActionForm>
                    </li>
                  ))}
                </ul>
                <details className="mt-2"><summary className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-brand-600 dark:text-brand-400"><Plus aria-hidden className="size-4" />نقطه عطف</summary>
                  <ActionForm action={saveMilestone.bind(null, s.id, null)} className="mt-2 grid grid-cols-[4rem_1fr] gap-2" resetOnSuccess submitLabel="افزودن" submitClassName="btn-secondary btn-sm">
                    <input name="week" className="input" placeholder="هفته" inputMode="numeric" aria-label="هفته" /><input name="title" className="input" placeholder="عنوان" aria-label="عنوان" /><FieldError name="week" className="col-span-2" /><FieldError name="title" className="col-span-2" />
                  </ActionForm>
                </details>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-bold">مسابقات</h3>
                <ul className="space-y-1 text-sm">
                  {s.competitions.map((c) => <li key={c.id}>{c.isTarget && <Target aria-hidden className="me-1 inline size-3.5 align-[-2px] text-brand-600 dark:text-brand-400" />}{c.name} — {dateOnlyToJalaliString(c.date)} · {COURSE_LABEL[c.course]} · {c.venue}</li>)}
                  {s.competitions.length === 0 && <li className="text-slate-500">مسابقه‌ای ثبت نشده</li>}
                </ul>
                <details className="mt-2"><summary className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-brand-600 dark:text-brand-400"><Plus aria-hidden className="size-4" />مسابقه</summary>
                  <ActionForm action={addCompetition.bind(null, s.id)} className="mt-2 grid gap-2 sm:grid-cols-2" resetOnSuccess submitLabel="افزودن" submitClassName="btn-secondary btn-sm">
                    <Field label="نام" name="name" /><Field label="تاریخ" name="date" dir="ltr" placeholder="1405/12/01" />
                    <Field label="محل" name="venue" />
                    <Field label="نوع استخر" name="course" as="select">{Object.entries(COURSE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Field>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isTarget" /> مسابقه هدف فصل</label>
                  </ActionForm>
                </details>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">مدت فصل: {faNum(Math.round((+s.endDate - +s.startDate) / (7 * 86400000)))} هفته</p>
          </Section>
        ))}
        {admin && (
          <Section title="فصل جدید">
            <ActionForm action={createSeason} className="grid gap-3 sm:grid-cols-3" resetOnSuccess submitLabel="ساخت فصل">
              <Field label="نام" name="name" /><Field label="شروع" name="startDate" dir="ltr" placeholder="1405/07/01" /><Field label="پایان" name="endDate" dir="ltr" placeholder="1405/12/29" />
              <div className="sm:col-span-3"><Field label="اهداف فصل" name="goals" as="textarea" /></div>
            </ActionForm>
          </Section>
        )}
      </div>
    </>
  );
}
