import type { PerformanceResult, SeasonTarget } from "@prisma/client";
import { COURSE_LABEL, STROKE_LABEL } from "@/lib/domain/labels";
import { eventKey, personalBests } from "@/lib/domain/performance";
import { dateOnlyToJalaliString, faNum } from "@/lib/domain/jalali";
import type { ChartRef, ChartResult } from "@/components/PerformanceChart";

export const eventLabel = (r: Pick<PerformanceResult, "stroke" | "distance" | "course">) =>
  `${faNum(r.distance)} متر ${STROKE_LABEL[r.stroke]} — ${COURSE_LABEL[r.course]}`;

/** Prepares chart data, PBs, baseline and target per comparable event. */
export function performanceView(results: PerformanceResult[], targets: SeasonTarget[]) {
  const chart: ChartResult[] = results.map((r) => ({
    id: r.id, event: eventKey(r), eventLabel: eventLabel(r), date: r.date.toISOString(), dateLabel: dateOnlyToJalaliString(r.date).slice(5),
    timeMs: r.timeMs, type: r.type,
  }));
  const pbs = personalBests(results);
  const keys = [...new Set(results.map(eventKey))];
  const refs: ChartRef[] = keys.map((k) => {
    const baseline = results.filter((r) => eventKey(r) === k && r.isBaseline).sort((a, b) => +a.date - +b.date)[0]
      ?? results.filter((r) => eventKey(r) === k).sort((a, b) => +a.date - +b.date)[0];
    const target = targets.find((t) => eventKey(t) === k);
    return { event: k, baselineMs: baseline?.timeMs ?? null, targetMs: target?.timeMs ?? null };
  });
  return { chart, pbs, refs };
}
