"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { INTENSITY_LABEL, SECTION_LABEL, STROKE_LABEL } from "@/lib/domain/labels";
import { planMeters, poolLengthWarning, repMeters, sectionMeters, setMeters } from "@/lib/domain/volume";
import { INTENSITIES, SECTIONS, STROKES, type PlanInput } from "@/lib/workout-schema";
import { addEquipment, saveWorkoutPlan } from "./actions";

type SetI = PlanInput["sections"][number]["sets"][number];
const num = (v: unknown) => Number(v) || 0;
const newSet = (): SetI => ({ rounds: 1, reps: 4, stroke: "FREESTYLE", intensity: "AEROBIC", restSec: 20, sendOffSec: null, focus: "", notes: "", equipment: [], segments: [{ meters: 50, description: "" }] });

export function Builder({
  planId, initial, targets, equipment: eq0, canPublish = true,
}: {
  planId: string | null;
  initial: PlanInput;
  targets: { value: string; label: string }[];
  equipment: { id: string; name: string }[];
  canPublish?: boolean;
}) {
  const [p, setP] = useState<PlanInput>(initial);
  const [equipment, setEquipment] = useState(eq0);
  const [newEq, setNewEq] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string; errors?: Record<string, string> } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const pool = num(p.poolLength) || 25;

  const calc = (sets: SetI[]) => sets.map((s) => ({ rounds: num(s.rounds), reps: num(s.reps), segments: s.segments.map((g) => ({ meters: num(g.meters) })) }));
  const total = useMemo(() => planMeters(p.sections.map((s) => ({ sets: calc(s.sets) }))), [p.sections]);

  const upd = (fn: (d: PlanInput) => void) => setP((cur) => { const d = structuredClone(cur); fn(d); return d; });

  const submit = (publish: boolean) =>
    start(async () => {
      const r = await saveWorkoutPlan(planId, p, publish);
      setMsg({ ok: !!r?.ok, text: r?.message ?? "", errors: r?.fieldErrors });
      if (r?.ok && r.redirectTo) router.push(r.redirectTo);
      else if (r?.ok) router.refresh();
    });

  const addEq = () =>
    start(async () => {
      const r = await addEquipment(newEq);
      if (r?.ok && r.data) { setEquipment((e) => [...e, r.data as { id: string; name: string }]); setNewEq(""); }
      else setMsg({ ok: false, text: r?.message ?? "خطا" });
    });

  return (
    <div className="space-y-4 pb-24">
      <div className="card grid gap-3 md:grid-cols-2">
        <label className="md:col-span-2"><span className="label">عنوان برنامه</span>
          <input className="input" value={p.title} onChange={(e) => upd((d) => { d.title = e.target.value; })} /></label>
        <label><span className="label">برای</span>
          <select className="input" value={p.target} onChange={(e) => upd((d) => { d.target = e.target.value; })}>
            <option value="">— انتخاب گروه یا ورزشکار —</option>
            {targets.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select></label>
        <label><span className="label">تاریخ (شمسی)</span>
          <input className="input" dir="ltr" value={p.date} onChange={(e) => upd((d) => { d.date = e.target.value; })} placeholder="1405/08/20" /></label>
        <label><span className="label">طول استخر</span>
          <select className="input" value={String(p.poolLength)} onChange={(e) => upd((d) => { d.poolLength = Number(e.target.value); })}>
            <option value="25">۲۵ متر</option><option value="50">۵۰ متر</option>
          </select></label>
        <label><span className="label">یادداشت کلی</span>
          <input className="input" value={p.notes ?? ""} onChange={(e) => upd((d) => { d.notes = e.target.value; })} /></label>
      </div>

      {p.sections.map((sec, si) => (
        <section key={si} className="card">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <select className="input w-auto font-bold" value={sec.kind} onChange={(e) => upd((d) => { d.sections[si].kind = e.target.value as typeof sec.kind; })} aria-label="نوع بخش">
              {SECTIONS.map((k) => <option key={k} value={k}>{SECTION_LABEL[k]}</option>)}
            </select>
            <div className="flex items-center gap-2 text-sm">
              <span className="rounded-lg bg-brand-50 px-2 py-1 font-medium text-brand-700">{sectionMeters({ sets: calc(sec.sets) }).toLocaleString("fa-IR")} متر</span>
              <button type="button" className="text-xs text-rose-600" onClick={() => upd((d) => { d.sections.splice(si, 1); })}>حذف بخش</button>
            </div>
          </div>
          <div className="space-y-3">
            {sec.sets.map((s, xi) => {
              const meters = setMeters(calc([s])[0]);
              const warn = poolLengthWarning({ segments: s.segments.map((g) => ({ meters: num(g.meters) })) }, pool);
              const setU = (fn: (x: SetI) => void) => upd((d) => fn(d.sections[si].sets[xi]));
              return (
                <div key={xi} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="w-20"><span className="label text-xs">دور</span><input className="input" inputMode="numeric" value={String(s.rounds)} onChange={(e) => setU((x) => { x.rounds = e.target.value as unknown as number; })} /></label>
                    <span className="pb-3">×</span>
                    <label className="w-20"><span className="label text-xs">تکرار</span><input className="input" inputMode="numeric" value={String(s.reps)} onChange={(e) => setU((x) => { x.reps = e.target.value as unknown as number; })} /></label>
                    <span className="pb-3">×</span>
                    <div className="flex flex-wrap items-end gap-1">
                      {s.segments.map((g, gi) => (
                        <div key={gi} className="flex items-end gap-1">
                          {gi > 0 && <span className="pb-3">+</span>}
                          <label className="w-20"><span className="label text-xs">متر</span><input className="input" inputMode="numeric" value={String(g.meters)} onChange={(e) => setU((x) => { x.segments[gi].meters = e.target.value as unknown as number; })} /></label>
                          <input className="input w-32" placeholder="توضیح بخش" value={g.description ?? ""} onChange={(e) => setU((x) => { x.segments[gi].description = e.target.value; })} aria-label="توضیح بخش" />
                          {s.segments.length > 1 && <button type="button" aria-label="حذف بخش تکرار" className="pb-3 text-rose-600" onClick={() => setU((x) => { x.segments.splice(gi, 1); })}>×</button>}
                        </div>
                      ))}
                      {s.segments.length < 5 && <button type="button" className="btn-secondary btn-sm mb-1" onClick={() => setU((x) => { x.segments.push({ meters: 5, description: "" }); })} title="مثلاً ۲۰ متر تمرکز + ۵ متر آرام">+ ترکیب</button>}
                    </div>
                    <div className="ms-auto pb-2 text-sm font-bold text-brand-700">= {meters.toLocaleString("fa-IR")} متر</div>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">هر تکرار: {repMeters({ segments: s.segments.map((g) => ({ meters: num(g.meters) })) }).toLocaleString("fa-IR")} متر</p>
                  {warn && <p className="mt-1 text-xs text-amber-700">⚠ {warn}</p>}
                  <div className="mt-2 grid gap-2 sm:grid-cols-4">
                    <select className="input" value={s.stroke} onChange={(e) => setU((x) => { x.stroke = e.target.value as SetI["stroke"]; })} aria-label="شنا">
                      {STROKES.map((k) => <option key={k} value={k}>{STROKE_LABEL[k]}</option>)}
                    </select>
                    <select className="input" value={s.intensity} onChange={(e) => setU((x) => { x.intensity = e.target.value as SetI["intensity"]; })} aria-label="شدت">
                      {INTENSITIES.map((k) => <option key={k} value={k}>{INTENSITY_LABEL[k]}</option>)}
                    </select>
                    <input className="input" inputMode="numeric" placeholder="استراحت (ثانیه)" value={String(s.restSec ?? "")} onChange={(e) => setU((x) => { x.restSec = e.target.value as unknown as number; })} aria-label="استراحت به ثانیه" />
                    <input className="input" inputMode="numeric" placeholder="زمان رفت (ثانیه)" value={String(s.sendOffSec ?? "")} onChange={(e) => setU((x) => { x.sendOffSec = e.target.value as unknown as number; })} aria-label="زمان رفت به ثانیه" />
                    <input className="input sm:col-span-2" placeholder="تمرکز تکنیکی" value={s.focus ?? ""} onChange={(e) => setU((x) => { x.focus = e.target.value; })} aria-label="تمرکز تکنیکی" />
                    <input className="input sm:col-span-2" placeholder="یادداشت مربی" value={s.notes ?? ""} onChange={(e) => setU((x) => { x.notes = e.target.value; })} aria-label="یادداشت مربی" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {equipment.map((e) => (
                      <label key={e.id} className="flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 px-2 text-xs has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                        <input type="checkbox" checked={s.equipment?.includes(e.id) ?? false} onChange={(ev) => setU((x) => { x.equipment = ev.target.checked ? [...(x.equipment ?? []), e.id] : (x.equipment ?? []).filter((y) => y !== e.id); })} />{e.name}
                      </label>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-3 text-xs">
                    <button type="button" className="text-brand-600" onClick={() => upd((d) => { d.sections[si].sets.splice(xi + 1, 0, structuredClone(s)); })}>تکثیر ست</button>
                    <button type="button" className="text-rose-600" onClick={() => upd((d) => { d.sections[si].sets.splice(xi, 1); })}>حذف ست</button>
                  </div>
                </div>
              );
            })}
          </div>
          <button type="button" className="btn-secondary btn-sm mt-3" onClick={() => upd((d) => { d.sections[si].sets.push(newSet()); })}>+ افزودن ست</button>
        </section>
      ))}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary" onClick={() => upd((d) => { d.sections.push({ kind: "MAIN", title: "", sets: [newSet()] }); })}>+ افزودن بخش</button>
        <div className="flex gap-1">
          <input className="input w-40" placeholder="تجهیزات جدید" value={newEq} onChange={(e) => setNewEq(e.target.value)} aria-label="نام تجهیزات جدید" />
          <button type="button" className="btn-secondary" disabled={!newEq.trim() || pending} onClick={addEq}>افزودن تجهیزات</button>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-14 z-20 border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:bottom-0 md:start-60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
          <p className="font-bold">حجم برنامه‌ریزی‌شده: <span className="text-brand-700">{total.toLocaleString("fa-IR")} متر</span></p>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" disabled={pending} onClick={() => submit(false)}>{pending ? "…" : "ذخیره پیش‌نویس"}</button>
            {canPublish && <button type="button" className="btn-primary" disabled={pending} onClick={() => submit(true)}>ذخیره و انتشار</button>}
          </div>
        </div>
        {msg && (
          <div role="status" className={`mx-auto mt-2 max-w-6xl rounded-xl px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
            {msg.text}
            {msg.errors && <ul className="mt-1 list-inside list-disc text-xs">{Object.values(msg.errors).slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}</ul>}
          </div>
        )}
      </div>
    </div>
  );
}
