import { Field } from "@/components/ui";
import { MAIN_STROKES, MEMBERSHIP_LABEL, STROKE_LABEL } from "@/lib/domain/labels";
import { dateOnlyToJalaliString } from "@/lib/domain/jalali";

type A = {
  user: { name: string }; birthDate: Date; enrolledAt: Date; groupId: string | null; status: string;
  specialtyStrokes: string[]; secondaryStrokes: string[]; trainingGoals: string | null; seasonGoals: string | null;
  emergencyName: string | null; emergencyPhone: string | null;
};

export function AthleteFields({ a, groups, allowNoGroup }: { a?: A; groups: { id: string; name: string }[]; allowNoGroup: boolean }) {
  const strokes = [...MAIN_STROKES, "IM"] as const;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="نام و نام خانوادگی" name="name" required defaultValue={a?.user.name} />
      <Field label="تاریخ تولد (شمسی)" name="birthDate" required placeholder="۱۳۹۰/۰۵/۱۲" defaultValue={a ? dateOnlyToJalaliString(a.birthDate) : ""} dir="ltr" />
      <Field label="گروه تمرینی" name="groupId" as="select" defaultValue={a?.groupId ?? ""}>
        {allowNoGroup && <option value="">— بدون گروه —</option>}
        {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
      </Field>
      <Field label="تاریخ عضویت (شمسی)" name="enrolledAt" required defaultValue={a ? dateOnlyToJalaliString(a.enrolledAt) : ""} placeholder="۱۴۰۵/۰۱/۱۵" dir="ltr" />
      <Field label="وضعیت عضویت" name="status" as="select" defaultValue={a?.status ?? "ACTIVE"}>
        {Object.entries(MEMBERSHIP_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </Field>
      <div />
      {(["specialtyStrokes", "secondaryStrokes"] as const).map((name) => (
        <fieldset key={name}>
          <legend className="label">{name === "specialtyStrokes" ? "شنای تخصصی" : "شنای دوم"}</legend>
          <div className="flex flex-wrap gap-2">
            {strokes.map((s) => (
              <label key={s} className="flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                <input type="checkbox" name={name} value={s} defaultChecked={a?.[name].includes(s)} />{STROKE_LABEL[s]}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <Field label="اهداف تمرینی" name="trainingGoals" as="textarea" defaultValue={a?.trainingGoals} />
      <Field label="اهداف فصل" name="seasonGoals" as="textarea" defaultValue={a?.seasonGoals} />
      <Field label="نام تماس اضطراری" name="emergencyName" defaultValue={a?.emergencyName} />
      <Field label="تلفن تماس اضطراری" name="emergencyPhone" defaultValue={a?.emergencyPhone} dir="ltr" inputMode="tel" />
    </div>
  );
}
