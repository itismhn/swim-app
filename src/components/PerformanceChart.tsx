"use client";
import { useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, ComposedChart, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from "recharts";
import { formatTime } from "@/lib/domain/performance";

export interface ChartResult { id: string; event: string; eventLabel: string; date: string; dateLabel: string; timeMs: number; type: "OFFICIAL" | "PRACTICE_TEST" }
export interface ChartRef { event: string; baselineMs?: number | null; targetMs?: number | null }

/**
 * Times across the season. The Y axis is reversed so that "up" means faster —
 * and it is labelled explicitly: a lower time is better.
 */
export function PerformanceChart({ results, refs }: { results: ChartResult[]; refs: ChartRef[] }) {
  const events = useMemo(() => [...new Map(results.map((r) => [r.event, r.eventLabel])).entries()], [results]);
  const [event, setEvent] = useState(events[0]?.[0] ?? "");
  const rows = results.filter((r) => r.event === event).sort((a, b) => a.date.localeCompare(b.date));
  const ref = refs.find((r) => r.event === event);
  if (!events.length) return <p className="text-sm text-slate-500">هنوز رکوردی ثبت نشده است.</p>;

  const data = rows.map((r) => ({
    x: r.dateLabel,
    all: r.timeMs,
    official: r.type === "OFFICIAL" ? r.timeMs : null,
    practice: r.type === "PRACTICE_TEST" ? r.timeMs : null,
  }));
  const values = [...rows.map((r) => r.timeMs), ref?.baselineMs, ref?.targetMs].filter((x): x is number => !!x);
  const pad = Math.max(500, (Math.max(...values) - Math.min(...values)) * 0.15);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <select value={event} onChange={(e) => setEvent(e.target.value)} className="input max-w-xs" aria-label="انتخاب ماده">
          {events.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <p className="rounded-lg bg-emerald-50 px-2 py-1 text-xs text-emerald-800">⬆ بالاتر در نمودار = زمان کمتر = بهتر</p>
      </div>
      <div dir="ltr" className="h-72 w-full">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="x" tick={{ fontSize: 11 }} />
            <YAxis reversed domain={[Math.min(...values) - pad, Math.max(...values) + pad]} tickFormatter={(v) => formatTime(v)} tick={{ fontSize: 11 }} width={56}
              label={{ value: "زمان (کمتر بهتر)", angle: -90, position: "insideLeft", fontSize: 11 }} />
            <Tooltip formatter={(v) => (typeof v === "number" ? formatTime(v) : "—")} />
            <Legend />
            <Line dataKey="all" name="روند" stroke="#94a3b8" strokeDasharray="4 4" dot={false} isAnimationActive={false} />
            <Scatter dataKey="official" name="مسابقه رسمی" fill="#0e6f98" shape="star" legendType="star" />
            <Scatter dataKey="practice" name="تست تمرینی" fill="#f59e0b" shape="circle" />
            {ref?.baselineMs && <ReferenceLine y={ref.baselineMs} stroke="#64748b" strokeDasharray="2 2" label={{ value: `مبنا ${formatTime(ref.baselineMs)}`, fontSize: 11, position: "insideTopRight" }} />}
            {ref?.targetMs && <ReferenceLine y={ref.targetMs} stroke="#16a34a" label={{ value: `هدف فصل ${formatTime(ref.targetMs)}`, fontSize: 11, position: "insideBottomRight" }} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
