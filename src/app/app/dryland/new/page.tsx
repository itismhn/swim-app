import { requireViewer } from "@/server/auth";
import { db } from "@/server/db";
import { STAFF } from "@/server/viewer";
import { Empty, PageHeader } from "@/components/ui";
import { toJalaliString } from "@/lib/domain/jalali";
import { assignableTargets } from "../../workouts/targets";
import { DrylandBuilder } from "../DrylandBuilder";

export const metadata = { title: "برنامه خشکی جدید" };

export default async function NewDryland() {
  const v = await requireViewer(STAFF);
  const [targets, exercises] = await Promise.all([assignableTargets(v), db.exercise.findMany({ select: { id: true, name: true, muscleGroup: true }, orderBy: { name: "asc" } })]);
  return (
    <>
      <PageHeader title="برنامه خشکی جدید" />
      {exercises.length === 0 ? <Empty title="کتابخانه حرکات خالی است" hint="ابتدا از صفحه تمرین خشکی حرکت اضافه کنید." /> : (
        <DrylandBuilder
          planId={null}
          targets={targets}
          exercises={exercises}
          initial={{ title: "", target: targets[0]?.value ?? "", date: toJalaliString(new Date()), notes: "", items: [{ exerciseId: exercises[0].id, sets: 3, reps: 10, durationSec: null, restSec: 30, notes: "" }] }}
        />
      )}
    </>
  );
}
