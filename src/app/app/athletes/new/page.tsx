import { requireViewer } from "@/server/auth";
import { db } from "@/server/db";
import { groupWhere } from "@/server/authz";
import { isAcademyWide, STAFF } from "@/server/viewer";
import { ActionForm } from "@/components/ActionForm";
import { Field, PageHeader } from "@/components/ui";
import { AthleteFields } from "../AthleteFields";
import { createAthlete } from "../actions";

export default async function NewAthlete() {
  const v = await requireViewer(STAFF);
  const groups = await db.group.findMany({ where: groupWhere(v), select: { id: true, name: true } });
  return (
    <>
      <PageHeader title="ثبت ورزشکار جدید" subtitle="فقط اطلاعات ضروری را وارد کنید. اطلاعات پزشکی پس از رضایت سرپرست ثبت می‌شود." />
      <ActionForm action={createAthlete} className="card space-y-4" submitLabel="ثبت ورزشکار">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="ایمیل ورود ورزشکار" name="email" type="email" required dir="ltr" />
          <Field label="رمز عبور اولیه" name="password" type="password" required dir="ltr" hint="حداقل ۱۰ کاراکتر؛ به ورزشکار/سرپرست به‌صورت حضوری تحویل دهید." />
        </div>
        <AthleteFields groups={groups} allowNoGroup={isAcademyWide(v)} />
      </ActionForm>
    </>
  );
}
