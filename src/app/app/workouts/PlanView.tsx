import { INTENSITY_LABEL, SECTION_LABEL, STROKE_LABEL } from "@/lib/domain/labels";
import { faNum } from "@/lib/domain/jalali";
import { sectionMeters, setMeters } from "@/lib/domain/volume";

interface SetV {
  rounds: number; reps: number; stroke: keyof typeof STROKE_LABEL; intensity: keyof typeof INTENSITY_LABEL; restSec: number | null; sendOffSec: number | null;
  focus: string | null; notes: string | null; segments: { meters: number; description: string | null }[]; equipment: { name: string }[];
}
export interface SectionV { kind: keyof typeof SECTION_LABEL; sets: SetV[] }

export const setLabel = (s: Pick<SetV, "rounds" | "reps" | "segments">) => {
  const rep = s.segments.length > 1 ? `(${s.segments.map((g) => faNum(g.meters)).join(" + ")})` : faNum(s.segments[0]?.meters ?? 0);
  return `${s.rounds > 1 ? `${faNum(s.rounds)} × ` : ""}${faNum(s.reps)} × ${rep}`;
};

export function PlanView({ sections }: { sections: SectionV[] }) {
  return (
    <div className="space-y-3">
      {sections.map((sec, i) => (
        <section key={i} className="card">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-bold text-brand-700">{faNum(i + 1)}. {SECTION_LABEL[sec.kind]}</h3>
            <span className="text-sm font-medium">{faNum(sectionMeters(sec))} متر</span>
          </div>
          <ul className="space-y-2">
            {sec.sets.map((s, j) => (
              <li key={j} className="rounded-xl bg-slate-50 p-3 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-base font-bold" dir="rtl">{setLabel(s)} متر {STROKE_LABEL[s.stroke]}</p>
                  <span className="text-xs text-slate-500">= {faNum(setMeters(s))} متر</span>
                </div>
                {s.segments.length > 1 && <p className="text-xs text-slate-600">هر تکرار: {s.segments.map((g) => `${faNum(g.meters)} متر ${g.description ?? ""}`).join(" + ")}</p>}
                <p className="mt-1 text-xs text-slate-600">
                  شدت: {INTENSITY_LABEL[s.intensity]}
                  {s.restSec ? ` · استراحت ${faNum(s.restSec)} ثانیه` : ""}
                  {s.sendOffSec ? ` · زمان رفت ${faNum(s.sendOffSec)} ثانیه` : ""}
                  {s.equipment.length ? ` · تجهیزات: ${s.equipment.map((e) => e.name).join("، ")}` : ""}
                </p>
                {s.focus && <p className="mt-1 text-xs">🎯 {s.focus}</p>}
                {s.notes && <p className="mt-1 text-xs text-slate-500">📝 {s.notes}</p>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
