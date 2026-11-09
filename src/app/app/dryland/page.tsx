import Link from "next/link";
import { requireViewer } from "@/server/auth";
import { db } from "@/server/db";
import { drylandPlanWhere } from "@/server/authz";
import { isStaff } from "@/server/viewer";
import { ActionForm, FieldError } from "@/components/ActionForm";
import { ExerciseMediaView } from "@/components/ExerciseMedia";
import { PlanBadge } from "@/components/badges";
import { Empty, Field, PageHeader, Section } from "@/components/ui";
import { dateOnlyToJalaliString, faNum } from "@/lib/domain/jalali";
import { addExercise, setExerciseMedia } from "./actions";

export const metadata = { title: "تمرین خشکی و قدرتی" };

export default async function Dryland() {
  const v = await requireViewer();
  const staff = isStaff(v);
  const [plans, exercises] = await Promise.all([
    db.drylandPlan.findMany({ where: drylandPlanWhere(v), include: { group: { select: { name: true } }, athlete: { select: { user: { select: { name: true } } } }, _count: { select: { items: true } } }, orderBy: { date: "desc" }, take: 40 }),
    db.exercise.findMany({ orderBy: { name: "asc" }, include: { media: { select: { id: true, mime: true } } } }),
  ]);
  return (
    <>
      <PageHeader title="تمرین خشکی و قدرتی" actions={staff && <Link href="/app/dryland/new" className="btn-primary">+ برنامه جدید</Link>} subtitle="این بخش جایگزین تشخیص یا درمان پزشکی نیست. در صورت درد، تمرین را متوقف کنید و به مربی اطلاع دهید." />
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
                <ExerciseMediaView media={e.media} name={e.name} />
                {e.mediaUrl && <a href={e.mediaUrl} target="_blank" rel="noopener noreferrer" className="link text-xs">پیوند خارجی ↗</a>}
                {staff && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs text-brand-600">{e.media ? "تعویض / حذف فایل" : "بارگذاری تصویر یا ویدیو"}</summary>
                    <ActionForm action={setExerciseMedia.bind(null, e.id)} className="mt-2 space-y-2" submitLabel="بارگذاری" submitClassName="btn-secondary btn-sm">
                      <input type="file" name="media" accept="image/jpeg,image/png,image/webp,video/mp4" className="block w-full text-xs" aria-label="فایل" />
                      <FieldError name="media" />
                      {e.media && <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="remove" value="1" /> حذف فایل فعلی</label>}
                    </ActionForm>
                  </details>
                )}
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
                <div>
                  <label className="label" htmlFor="f-media">تصویر یا ویدیوی کوتاه (اختیاری)</label>
                  <input id="f-media" type="file" name="media" accept="image/jpeg,image/png,image/webp,video/mp4" className="block w-full text-sm" />
                  <p className="mt-1 text-xs text-slate-500">JPG، PNG، WebP یا MP4 — حداکثر ۴ مگابایت</p>
                  <FieldError name="media" />
                </div>
                <Field label="یا نشانی خارجی (اختیاری)" name="mediaUrl" dir="ltr" placeholder="https://" />
              </ActionForm>
            </details>
          )}
        </Section>
      </div>
    </>
  );
}
