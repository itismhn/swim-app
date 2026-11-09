import Link from "next/link";
import { requireViewer } from "@/server/auth";
import { db } from "@/server/db";
import { drylandPlanWhere } from "@/server/authz";
import { isStaff } from "@/server/viewer";
import { ActionForm } from "@/components/ActionForm";
import { PlanBadge } from "@/components/badges";
import { Empty, Field, PageHeader, Section } from "@/components/ui";
import { dateOnlyToJalaliString, faNum, toJalaliString } from "@/lib/domain/jalali";
import { assignableTargets } from "../workouts/targets";
import { addExercise, createDrylandPlan } from "./actions";

export const metadata = { title: "تمرین خشکی و قدرتی" };

export default async function Dryland() {
  const v = await requireViewer();
  const staff = isStaff(v);
  const [plans, exercises, targets] = await Promise.all([
    db.drylandPlan.findMany({ where: drylandPlanWhere(v), include: { group: { select: { name: true } }, athlete: { select: { user: { select: { name: true } } } }, _count: { select: { items: true } } }, orderBy: { date: "desc" }, take: 40 }),
    db.exercise.findMany({ orderBy: { name: "asc" } }),
    staff ? assignableTargets(v) : [],
  ]);
  return (
    <>
      <PageHeader title="تمرین خشکی و قدرتی" subtitle="این بخش جایگزین تشخیص یا درمان پزشکی نیست. در صورت درد، تمرین را متوقف کنید و به مربی اطلاع دهید." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="برنامه‌ها">
          {plans.length === 0 ? <Empty title="برنامه‌ای وجود ندارد" /> : (
            <ul className="space-y-2">
              {plans.map((p) => (
                <li key={p.id}>
                  <Link href={`/app/dryland/${p.id}`} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 p-3 hover:border-brand-200">
                    <div>
                      <p className="font-medium">{p.title}</p>
                      <p className="text-xs text-slate-500">{dateOnlyToJalaliString(p.date)} · {p.group ? p.group.name : p.athlete?.user.name} · {faNum(p._count.items)} حرکت</p>
                    </div>
                    <PlanBadge s={p.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="کتابخانه حرکات">
          <ul className="max-h-96 space-y-2 overflow-y-auto">
            {exercises.map((e) => (
              <li key={e.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                <p className="font-medium">{e.name} <span className="text-xs text-slate-500">· {e.muscleGroup}</span></p>
                {e.description && <p className="text-xs">{e.description}</p>}
                {e.safetyNotes && <p className="mt-1 text-xs text-amber-800">⚠ {e.safetyNotes}</p>}
                {e.mediaUrl && <a href={e.mediaUrl} target="_blank" rel="noopener noreferrer" className="link text-xs">تصویر / ویدیو</a>}
              </li>
            ))}
          </ul>
          {staff && (
            <details className="mt-3">
              <summary className="btn-secondary btn-sm cursor-pointer">+ حرکت جدید</summary>
              <ActionForm action={addExercise} className="mt-3 grid gap-3" resetOnSuccess submitLabel="افزودن">
                <Field label="نام حرکت" name="name" required />
                <Field label="گروه عضلانی" name="muscleGroup" required />
                <Field label="توضیح اجرا" name="description" as="textarea" />
                <Field label="نکات ایمنی و تکنیک" name="safetyNotes" as="textarea" />
                <Field label="نشانی تصویر یا ویدیو (اختیاری)" name="mediaUrl" dir="ltr" placeholder="https://" />
              </ActionForm>
            </details>
          )}
        </Section>
      </div>
      {staff && exercises.length > 0 && (
        <div className="mt-4">
          <Section title="برنامه خشکی جدید">
            <ActionForm action={createDrylandPlan} className="space-y-3" submitLabel="ذخیره برنامه">
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="عنوان" name="title" required />
                <Field label="برای" name="target" as="select">{targets.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Field>
                <Field label="تاریخ" name="date" defaultValue={toJalaliString(new Date())} dir="ltr" />
              </div>
              <div className="space-y-2">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2 rounded-xl border border-slate-100 p-2 md:grid-cols-6">
                    <select name={`ex${i}`} className="input col-span-2" aria-label={`حرکت ${i + 1}`}><option value="">— حرکت {faNum(i + 1)} —</option>{exercises.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
                    <input name={`sets${i}`} className="input" placeholder="ست" inputMode="numeric" defaultValue={3} aria-label="ست" />
                    <input name={`reps${i}`} className="input" placeholder="تکرار" inputMode="numeric" aria-label="تکرار" />
                    <input name={`dur${i}`} className="input" placeholder="مدت (ثانیه)" inputMode="numeric" aria-label="مدت به ثانیه" />
                    <input name={`rest${i}`} className="input" placeholder="استراحت (ثانیه)" inputMode="numeric" aria-label="استراحت به ثانیه" />
                    <input name={`notes${i}`} className="input col-span-2 md:col-span-6" placeholder="یادداشت مربی" aria-label="یادداشت مربی" />
                  </div>
                ))}
              </div>
              <Field label="یادداشت کلی" name="notes" />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="publish" /> انتشار فوری (اطلاع به ورزشکاران و خانواده‌ها)</label>
            </ActionForm>
          </Section>
        </div>
      )}
    </>
  );
}
