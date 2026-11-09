import Link from "next/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/server/auth";
import { db } from "@/server/db";
import { athleteWhere, workoutPlanWhere } from "@/server/authz";
import { isStaff } from "@/server/viewer";
import { ActionForm } from "@/components/ActionForm";
import { PlanBadge } from "@/components/badges";
import { Field, PageHeader, Section } from "@/components/ui";
import { dateOnlyToJalaliString, faDateTime, faNum } from "@/lib/domain/jalali";
import { completionRatio } from "@/lib/domain/volume";
import type { PlanData } from "@/lib/workout-schema";
import { Builder } from "../Builder";
import { PlanView, setLabel } from "../PlanView";
import { assignableTargets } from "../targets";
import { logCompletion, replyToCompletion } from "../actions";

export default async function WorkoutPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ edit?: string }> }) {
  const v = await requireViewer();
  const { id } = await params;
  const { edit } = await searchParams;
  const plan = await db.workoutPlan.findFirst({
    where: { AND: [{ id }, workoutPlanWhere(v)] },
    include: {
      group: { select: { name: true } },
      athlete: { select: { user: { select: { name: true } } } },
      author: { select: { name: true } },
      sections: { orderBy: { order: "asc" }, include: { sets: { orderBy: { order: "asc" }, include: { segments: { orderBy: { order: "asc" } }, equipment: { include: { equipment: true } } } } } },
      revisions: { orderBy: { version: "desc" } },
    },
  });
  if (!plan) notFound();
  const staff = isStaff(v);
  // Completions are filtered to athletes the viewer can see.
  const completions = await db.workoutCompletion.findMany({
    where: { planId: id, athlete: athleteWhere(v) },
    include: { athlete: { select: { user: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  const sections = plan.sections.map((s) => ({ kind: s.kind, sets: s.sets.map((x) => ({ ...x, equipment: x.equipment.map((e) => e.equipment) })) }));
  const myCompletion = v.role === "ATHLETE" ? completions[0] : null;

  if (staff && edit) {
    const [targets, equipment] = await Promise.all([assignableTargets(v), db.equipment.findMany({ select: { id: true, name: true } })]);
    return (
      <>
        <PageHeader title={`ویرایش: ${plan.title}`} subtitle={`ذخیره، نسخه ${faNum(plan.version + 1)} را می‌سازد.`} actions={<Link href={`/app/workouts/${id}`} className="btn-secondary">انصراف</Link>} />
        <Builder
          planId={id}
          targets={targets}
          equipment={equipment}
          initial={{
            title: plan.title, target: plan.groupId ? `group:${plan.groupId}` : `athlete:${plan.athleteId}`, date: dateOnlyToJalaliString(plan.date), poolLength: plan.poolLength, notes: plan.notes ?? "",
            sections: plan.sections.map((s) => ({
              kind: s.kind, title: s.title ?? "",
              sets: s.sets.map((x) => ({ rounds: x.rounds, reps: x.reps, stroke: x.stroke, intensity: x.intensity, restSec: x.restSec, sendOffSec: x.sendOffSec, focus: x.focus ?? "", notes: x.notes ?? "", equipment: x.equipment.map((e) => e.equipmentId), segments: x.segments.map((g) => ({ meters: g.meters, description: g.description ?? "" })) })),
            })),
          }}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={plan.title}
        subtitle={<>{dateOnlyToJalaliString(plan.date)} · {plan.group ? `گروه ${plan.group.name}` : `فردی: ${plan.athlete?.user.name}`} · استخر {faNum(plan.poolLength)} متری · مربی: {plan.author.name} <PlanBadge s={plan.status} /></>}
        actions={staff && <Link href={`/app/workouts/${id}?edit=1`} className="btn-primary">ویرایش / انتشار</Link>}
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="card"><p className="text-xs text-slate-500">حجم برنامه‌ریزی‌شده</p><p className="text-2xl font-bold text-brand-700">{faNum(plan.plannedMeters)} متر</p></div>
        {myCompletion && <div className="card"><p className="text-xs text-slate-500">حجم انجام‌شده (گزارش شما)</p><p className="text-2xl font-bold">{faNum(myCompletion.actualMeters)} متر</p></div>}
      </div>
      {plan.notes && <p className="card mb-4 text-sm">{plan.notes}</p>}
      <PlanView sections={sections} />

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {v.role === "ATHLETE" && (
          <Section title="گزارش اجرای تمرین">
            <ActionForm action={logCompletion.bind(null, id)} className="space-y-3" submitLabel={myCompletion ? "به‌روزرسانی گزارش" : "ثبت گزارش"}>
              <Field label="متراژ انجام‌شده" name="actualMeters" inputMode="numeric" defaultValue={myCompletion?.actualMeters ?? plan.plannedMeters} />
              <Field label="میزان سختی (۱ تا ۱۰)" name="rpe" inputMode="numeric" defaultValue={myCompletion?.rpe ?? ""} />
              <Field label="بازخورد یا سؤال برای مربی" name="feedback" as="textarea" defaultValue={myCompletion?.feedback} />
            </ActionForm>
            {myCompletion?.coachReply && <p className="mt-3 rounded-xl bg-brand-50 p-3 text-sm">پاسخ مربی: {myCompletion.coachReply}</p>}
          </Section>
        )}
        {(staff || v.role === "GUARDIAN") && (
          <Section title={`گزارش‌های اجرا (${faNum(completions.length)})`}>
            {completions.length === 0 ? <p className="text-sm text-slate-500">هنوز گزارشی ثبت نشده است.</p> : (
              <ul className="space-y-3 text-sm">
                {completions.map((c) => {
                  const r = completionRatio(c.actualMeters, plan.plannedMeters);
                  return (
                    <li key={c.id} className="rounded-xl bg-slate-50 p-3">
                      <p className="font-medium">{c.athlete.user.name}</p>
                      <p className="text-xs text-slate-500">انجام‌شده {faNum(c.actualMeters)} از {faNum(plan.plannedMeters)} متر{r !== null ? ` (${faNum(Math.round(r * 100))}٪)` : ""} · سختی {c.rpe ? faNum(c.rpe) : "—"}/۱۰ · {faDateTime(c.createdAt)}</p>
                      {c.feedback && <p className="mt-1">{c.feedback}</p>}
                      {c.coachReply && <p className="mt-1 text-brand-700">پاسخ مربی: {c.coachReply}</p>}
                      {staff && (
                        <ActionForm action={replyToCompletion.bind(null, c.id)} className="mt-2 flex items-end gap-2" submitLabel="پاسخ" submitClassName="btn-secondary btn-sm">
                          <input name="coachReply" className="input min-h-9" placeholder="پاسخ به بازخورد…" aria-label="پاسخ به بازخورد" />
                        </ActionForm>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        )}
        {staff && (
          <Section title="سابقه نسخه‌ها">
            <ul className="space-y-2 text-sm">
              {plan.revisions.map((r) => {
                const snap = r.snapshot as unknown as PlanData & { plannedMeters: number };
                return (
                  <li key={r.id}>
                    <details className="rounded-xl border border-slate-100 p-2">
                      <summary className="cursor-pointer">نسخه {faNum(r.version)} · {faDateTime(r.createdAt)} · <PlanBadge s={r.status} /> · {faNum(snap.plannedMeters ?? 0)} متر</summary>
                      <ul className="mt-2 list-inside list-disc text-xs text-slate-600">
                        {snap.sections?.flatMap((s) => s.sets.map((x, i) => <li key={`${s.kind}${i}`}>{setLabel(x)} متر</li>))}
                      </ul>
                    </details>
                  </li>
                );
              })}
            </ul>
          </Section>
        )}
      </div>
    </>
  );
}
