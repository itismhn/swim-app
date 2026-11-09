"use client";
import { CheckCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ATTENDANCE_LABEL } from "@/lib/domain/labels";
import { saveAttendance } from "./actions";

type Status = keyof typeof ATTENDANCE_LABEL;
const ORDER: Status[] = ["PRESENT", "LATE", "LEFT_EARLY", "EXCUSED", "ABSENT"];
const COLORS: Record<Status, string> = {
  PRESENT: "bg-emerald-600 text-white border-emerald-600",
  LATE: "bg-amber-500 text-white border-amber-500",
  LEFT_EARLY: "bg-orange-500 text-white border-orange-500",
  EXCUSED: "bg-violet-600 text-white border-violet-600",
  ABSENT: "bg-rose-600 text-white border-rose-600",
};

export function AttendanceSheet({ sessionId, athletes }: { sessionId: string; athletes: { id: string; name: string; status: Status | null; note: string | null }[] }) {
  const [state, setState] = useState(() => Object.fromEntries(athletes.map((a) => [a.id, { status: a.status, note: a.note ?? "" }])));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = (id: string, patch: Partial<{ status: Status; note: string }>) => setState((s) => ({ ...s, [id]: { ...s[id], ...patch } }));
  const unmarked = athletes.filter((a) => !state[a.id].status).length;

  const save = () =>
    start(async () => {
      const entries = athletes.filter((a) => state[a.id].status).map((a) => ({ athleteId: a.id, status: state[a.id].status!, note: state[a.id].note }));
      const r = await saveAttendance(sessionId, entries);
      setMsg({ ok: !!r?.ok, text: r?.message ?? "" });
      if (r?.ok) router.refresh();
    });

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <button type="button" className="btn-secondary btn-sm" onClick={() => athletes.forEach((a) => !state[a.id].status && set(a.id, { status: "PRESENT" }))}>
          <CheckCheck aria-hidden /> بقیه حاضر
        </button>
        <span className="self-center text-xs text-slate-500">{unmarked ? `${unmarked.toLocaleString("fa-IR")} نفر بدون وضعیت` : "همه ثبت شده‌اند"}</span>
      </div>
      <ul className="space-y-2">
        {athletes.map((a) => (
          <li key={a.id} className="card p-3">
            <p className="mb-2 font-medium">{a.name}</p>
            <div className="grid grid-cols-5 gap-1" role="radiogroup" aria-label={`وضعیت ${a.name}`}>
              {ORDER.map((s) => (
                <button key={s} type="button" role="radio" aria-checked={state[a.id].status === s} onClick={() => set(a.id, { status: s })}
                  className={`min-h-12 rounded-lg border text-xs font-medium ${state[a.id].status === s ? COLORS[s] : "border-slate-200 bg-surface text-slate-700"}`}>
                  {ATTENDANCE_LABEL[s]}
                </button>
              ))}
            </div>
            <input className="input mt-2 min-h-9 text-base sm:text-xs" placeholder="یادداشت (اختیاری)" value={state[a.id].note} onChange={(e) => set(a.id, { note: e.target.value })} aria-label={`یادداشت ${a.name}`} />
          </li>
        ))}
      </ul>
      <div className="sticky bottom-16 z-10 mt-4 md:bottom-4">
        <button type="button" onClick={save} disabled={pending} className="btn-primary w-full shadow-lg">{pending ? "در حال ذخیره…" : "ذخیره حضور و غیاب"}</button>
        {msg && <p role="status" className={`mt-2 rounded-xl px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{msg.text}</p>}
      </div>
    </div>
  );
}
