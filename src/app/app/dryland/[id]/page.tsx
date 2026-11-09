import { notFound } from "next/navigation";
import { requireViewer } from "@/server/auth";
import { db } from "@/server/db";
import { athleteWhere, drylandPlanWhere } from "@/server/authz";
import { isStaff } from "@/server/viewer";
import { ActionForm } from "@/components/ActionForm";
import { PlanBadge } from "@/components/badges";
import { Badge, PageHeader } from "@/components/ui";
import { dateOnlyToJalaliString, faNum } from "@/lib/domain/jalali";
import { logDryland, publishDryland } from "../actions";

export default async function DrylandPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const v = await requireViewer();
  const { id } = await params;
  const plan = await db.drylandPlan.findFirst({
    where: { AND: [{ id }, drylandPlanWhere(v)] },
    include: {
      group: { select: { name: true } }, athlete: { select: { user: { select: { name: true } } } },
      items: {
        orderBy: { order: "asc" },
        include: { exercise: true, logs: { where: { athlete: athleteWhere(v) }, include: { athlete: { select: { user: { select: { name: true } } } } } } },
      },
    },
  });
  if (!plan) notFound();
  const staff = isStaff(v);
  const me = v.role === "ATHLETE" ? await db.athlete.findUnique({ where: { userId: v.id }, select: { id: true } }) : null;

  return (
    <>
      <PageHeader
        title={plan.title}
        subtitle={<>{dateOnlyToJalaliString(plan.date)} · {plan.group?.name ?? plan.athlete?.user.name} <PlanBadge s={plan.status} /></>}
        actions={staff && plan.status === "DRAFT" && <form action={async () => { "use server"; await publishDryland(id); }}><button className="btn-primary">انتشار</button></form>}
      />
      <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">در صورت احساس درد یا ناراحتی، حرکت را متوقف کنید و آن را علامت بزنید. این سامانه تشخیص یا درمان پزشکی ارائه نمی‌دهد؛ مربی برای بررسی با خانواده تماس می‌گیرد.</p>
      {plan.notes && <p className="card mb-4 text-sm">{plan.notes}</p>}
      <ol className="space-y-3">
        {plan.items.map((it, i) => {
          const mine = me ? it.logs.find((l) => l.athleteId === me.id) : null;
          return (
            <li key={it.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{faNum(i + 1)}. {it.exercise.name} <span className="text-xs font-normal text-slate-500">· {it.exercise.muscleGroup}</span></p>
                  <p className="text-sm">{faNum(it.sets)} ست{it.reps ? ` × ${faNum(it.reps)} تکرار` : ""}{it.durationSec ? ` × ${faNum(it.durationSec)} ثانیه` : ""}{it.restSec ? ` · استراحت ${faNum(it.restSec)} ثانیه` : ""}</p>
                  {it.notes && <p className="text-xs text-slate-500">📝 {it.notes}</p>}
                  {it.exercise.safetyNotes && <p className="mt-1 text-xs text-amber-800">⚠ {it.exercise.safetyNotes}</p>}
                </div>
                {mine && <Badge tone={mine.pain ? "red" : mine.completed ? "green" : "gray"}>{mine.pain ? "درد گزارش شد" : mine.completed ? "انجام شد" : "ناتمام"}</Badge>}
              </div>
              {v.role === "ATHLETE" && plan.status === "PUBLISHED" && (
                <ActionForm action={logDryland.bind(null, it.id)} className="mt-3 grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-4" submitLabel="ثبت" submitClassName="btn-secondary btn-sm">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="completed" defaultChecked={mine?.completed} /> انجام دادم</label>
                  <label className="text-sm">سختی (۱–۱۰)<input name="difficulty" className="input min-h-9" inputMode="numeric" defaultValue={mine?.difficulty ?? ""} /></label>
                  <label className="flex items-center gap-2 text-sm text-rose-700"><input type="checkbox" name="pain" defaultChecked={mine?.pain} /> درد یا ناراحتی داشتم</label>
                  <input name="painNote" className="input min-h-9" placeholder="کجا / چه زمانی؟" defaultValue={mine?.painNote ?? ""} aria-label="توضیح درد" />
                </ActionForm>
              )}
              {(staff || v.role === "GUARDIAN") && it.logs.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-slate-100 pt-2 text-xs">
                  {it.logs.map((l) => (
                    <li key={l.id} className={l.pain ? "font-medium text-rose-700" : ""}>
                      {l.athlete.user.name}: {l.completed ? "انجام شد" : "ناتمام"} · سختی {l.difficulty ? faNum(l.difficulty) : "—"}{l.pain ? ` · ⚠ درد: ${l.painNote ?? "بدون توضیح"}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}
