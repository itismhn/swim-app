import { requireViewer } from "@/server/auth";
import { db } from "@/server/db";
import { STAFF } from "@/server/viewer";
import { PageHeader } from "@/components/ui";
import { toJalaliString } from "@/lib/domain/jalali";
import { Builder } from "../Builder";
import { assignableTargets } from "../targets";

export const metadata = { title: "برنامه تمرین جدید" };

export default async function NewWorkout() {
  const v = await requireViewer(STAFF);
  const [targets, equipment, settings] = await Promise.all([
    assignableTargets(v),
    db.equipment.findMany({ orderBy: [{ builtIn: "desc" }, { name: "asc" }], select: { id: true, name: true } }),
    db.academySetting.findUnique({ where: { id: 1 } }),
  ]);
  const set = (meters: number, reps = 1, intensity: "EASY" | "AEROBIC" | "TECHNIQUE" | "THRESHOLD" | "RECOVERY" = "AEROBIC") =>
    ({ rounds: 1, reps, stroke: "FREESTYLE" as const, intensity, restSec: 20, sendOffSec: null, focus: "", notes: "", equipment: [], segments: [{ meters, description: "" }] });
  return (
    <>
      <PageHeader title="برنامه تمرین جدید در آب" subtitle="حجم هر ست، هر بخش و کل برنامه هنگام تایپ محاسبه می‌شود." />
      <Builder
        planId={null}
        targets={targets}
        equipment={equipment}
        initial={{
          title: "", target: targets[0]?.value ?? "", date: toJalaliString(new Date()), poolLength: settings?.poolLengthMeters ?? 25, notes: "",
          sections: [
            { kind: "WARMUP", title: "", sets: [set(400, 1, "EASY")] },
            { kind: "TECHNIQUE", title: "", sets: [set(50, 6, "TECHNIQUE")] },
            { kind: "KICK_PULL", title: "", sets: [set(100, 4)] },
            { kind: "MAIN", title: "", sets: [set(100, 8, "THRESHOLD")] },
            { kind: "SKILLS", title: "", sets: [{ ...set(25, 6, "TECHNIQUE"), segments: [{ meters: 15, description: "استارت + زیرآبی" }, { meters: 10, description: "آرام" }] }] },
            { kind: "COOLDOWN", title: "", sets: [set(200, 1, "RECOVERY")] },
          ],
        }}
      />
    </>
  );
}
