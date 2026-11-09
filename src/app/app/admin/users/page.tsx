import { requireViewer } from "@/server/auth";
import { db } from "@/server/db";
import { ActionForm } from "@/components/ActionForm";
import { Badge, Field, PageHeader, SampleBadge, Section } from "@/components/ui";
import { ROLE_LABEL } from "@/lib/domain/labels";
import { createUser, updateUser } from "../actions";

export const metadata = { title: "کاربران" };

export default async function Users({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const v = await requireViewer(["ADMIN"]);
  const { role } = await searchParams;
  const users = await db.user.findMany({
    where: role ? { role: role as keyof typeof ROLE_LABEL } : {},
    select: { id: true, name: true, email: true, role: true, active: true, isSample: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
  return (
    <>
      <PageHeader title="کاربران و نقش‌ها" />
      <form className="card mb-4 flex gap-2">
        <select name="role" defaultValue={role ?? ""} className="input w-auto" aria-label="نقش"><option value="">همه نقش‌ها</option>{Object.entries(ROLE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <button className="btn-secondary">فیلتر</button>
      </form>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-2 lg:col-span-2">
          {users.map((u) => (
            <details key={u.id} className="card">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                <span>{u.name} {u.isSample && <SampleBadge />} <span dir="ltr" className="text-xs text-slate-500">{u.email}</span></span>
                <span className="flex gap-1"><Badge tone="blue">{ROLE_LABEL[u.role]}</Badge>{!u.active && <Badge tone="red">غیرفعال</Badge>}</span>
              </summary>
              {u.id !== v.id && (
                <ActionForm action={updateUser.bind(null, u.id)} className="mt-3 grid gap-3 sm:grid-cols-3" submitLabel="ذخیره" submitClassName="btn-secondary btn-sm">
                  <Field label="نقش" name="role" as="select" defaultValue={u.role}>{Object.entries(ROLE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Field>
                  <Field label="رمز عبور جدید (اختیاری)" name="password" type="password" dir="ltr" />
                  <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" name="active" defaultChecked={u.active} /> حساب فعال</label>
                </ActionForm>
              )}
            </details>
          ))}
        </div>
        <Section title="کاربر جدید">
          <ActionForm action={createUser} className="space-y-3" resetOnSuccess submitLabel="ساخت حساب">
            <Field label="نام" name="name" />
            <Field label="ایمیل" name="email" type="email" dir="ltr" />
            <Field label="تلفن" name="phone" dir="ltr" />
            <Field label="نقش" name="role" as="select" defaultValue="COACH">{Object.entries(ROLE_LABEL).filter(([k]) => k !== "ATHLETE").map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Field>
            <Field label="رمز عبور اولیه" name="password" type="password" dir="ltr" hint="حداقل ۱۰ کاراکتر" />
          </ActionForm>
        </Section>
      </div>
    </>
  );
}
