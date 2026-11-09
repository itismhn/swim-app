"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveDrylandPlan } from "./actions";

export interface DrylandItemInput {
  id?: string;
  exerciseId: string;
  sets: string | number;
  reps: string | number | null;
  durationSec: string | number | null;
  restSec: string | number | null;
  notes: string | null;
  locked?: boolean; // has athlete logs → cannot be removed
}
export interface DrylandInput { title: string; target: string; date: string; notes: string | null; items: DrylandItemInput[] }

const blank = (exerciseId = ""): DrylandItemInput => ({ exerciseId, sets: 3, reps: 10, durationSec: null, restSec: 30, notes: "" });

export function DrylandBuilder({
  planId, initial, targets, exercises, published,
}: {
  planId: string | null;
  initial: DrylandInput;
  targets: { value: string; label: string }[];
  exercises: { id: string; name: string; muscleGroup: string }[];
  published?: boolean;
}) {
  const [p, setP] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; errors?: string[] } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const upd = (fn: (d: DrylandInput) => void) => setP((c) => { const d = structuredClone(c); fn(d); return d; });
  const move = (i: number, dir: -1 | 1) => upd((d) => { const j = i + dir; if (j < 0 || j >= d.items.length) return; [d.items[i], d.items[j]] = [d.items[j], d.items[i]]; });

  const submit = (publish: boolean) =>
    start(async () => {
      const r = await saveDrylandPlan(planId, p, publish);
      setMsg({ ok: !!r?.ok, text: r?.message ?? "", errors: r?.fieldErrors ? Object.values(r.fieldErrors) : undefined });
      if (r?.ok && r.redirectTo) router.push(r.redirectTo);
      else if (r?.ok) router.refresh();
    });

  const num = (label: string, value: string | number | null, set: (v: string) => void) => (
    <label className="text-xs"><span className="mb-1 block text-slate-500">{label}</span>
      <input className="input min-h-10" inputMode="numeric" value={value == null ? "" : String(value)} onChange={(e) => set(e.target.value)} /></label>
  );

  return (
    <div className="space-y-4 pb-24">
      <div className="card grid gap-3 md:grid-cols-3">
        <label><span className="label">عنوان</span><input className="input" value={p.title} onChange={(e) => upd((d) => { d.title = e.target.value; })} /></label>
        <label><span className="label">برای</span>
          <select className="input" value={p.target} onChange={(e) => upd((d) => { d.target = e.target.value; })}>
            <option value="">— انتخاب —</option>{targets.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select></label>
        <label><span className="label">تاریخ (شمسی)</span><input className="input" dir="ltr" value={p.date} onChange={(e) => upd((d) => { d.date = e.target.value; })} /></label>
        <label className="md:col-span-3"><span className="label">یادداشت کلی</span><input className="input" value={p.notes ?? ""} onChange={(e) => upd((d) => { d.notes = e.target.value; })} /></label>
      </div>

      <ol className="space-y-3">
        {p.items.map((it, i) => (
          <li key={it.id ?? `new-${i}`} className="card">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm font-bold">{(i + 1).toLocaleString("fa-IR")}.</span>
              <div className="flex gap-2 text-xs">
                <button type="button" className="btn-secondary btn-sm" aria-label="بالا" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
                <button type="button" className="btn-secondary btn-sm" aria-label="پایین" onClick={() => move(i, 1)} disabled={i === p.items.length - 1}>↓</button>
                {it.locked
                  ? <span className="self-center text-slate-400" title="ورزشکاران برای این حرکت گزارش ثبت کرده‌اند">🔒 دارای گزارش</span>
                  : <button type="button" className="text-rose-600" onClick={() => upd((d) => { d.items.splice(i, 1); })}>حذف</button>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
              <label className="col-span-2 text-xs"><span className="mb-1 block text-slate-500">حرکت</span>
                <select className="input min-h-10" value={it.exerciseId} disabled={it.locked} onChange={(e) => upd((d) => { d.items[i].exerciseId = e.target.value; })}>
                  <option value="">— انتخاب حرکت —</option>
                  {exercises.map((e) => <option key={e.id} value={e.id}>{e.name} · {e.muscleGroup}</option>)}
                </select></label>
              {num("ست", it.sets, (v) => upd((d) => { d.items[i].sets = v; }))}
              {num("تکرار", it.reps, (v) => upd((d) => { d.items[i].reps = v; }))}
              {num("مدت (ثانیه)", it.durationSec, (v) => upd((d) => { d.items[i].durationSec = v; }))}
              {num("استراحت (ثانیه)", it.restSec, (v) => upd((d) => { d.items[i].restSec = v; }))}
              <input className="input col-span-2 min-h-10 md:col-span-6" placeholder="یادداشت مربی" aria-label="یادداشت مربی" value={it.notes ?? ""} onChange={(e) => upd((d) => { d.items[i].notes = e.target.value; })} />
            </div>
          </li>
        ))}
      </ol>
      <button type="button" className="btn-secondary" onClick={() => upd((d) => { d.items.push(blank()); })} disabled={p.items.length >= 20}>+ افزودن حرکت</button>

      <div className="fixed inset-x-0 bottom-14 z-20 border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:bottom-0 md:start-60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
          <p className="text-sm">{p.items.length.toLocaleString("fa-IR")} حرکت</p>
          <div className="flex gap-2">
            {!published && <button type="button" className="btn-secondary" disabled={pending} onClick={() => submit(false)}>ذخیره پیش‌نویس</button>}
            <button type="button" className="btn-primary" disabled={pending} onClick={() => submit(true)}>{pending ? "…" : published ? "ذخیره و اطلاع‌رسانی" : "ذخیره و انتشار"}</button>
          </div>
        </div>
        {msg && (
          <div role="status" className={`mx-auto mt-2 max-w-6xl rounded-xl px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
            {msg.text}{msg.errors && <ul className="mt-1 list-inside list-disc text-xs">{msg.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}</ul>}
          </div>
        )}
      </div>
    </div>
  );
}
