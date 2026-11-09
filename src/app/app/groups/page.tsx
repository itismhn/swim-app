import Link from "next/link";
import { requireViewer } from "@/server/auth";
import { db } from "@/server/db";
import { groupWhere } from "@/server/authz";
import { STAFF } from "@/server/viewer";
import { ActionForm } from "@/components/ActionForm";
import { Empty, Field, PageHeader } from "@/components/ui";
import { WEEKDAY_LABEL } from "@/lib/domain/labels";
import { faNum } from "@/lib/domain/jalali";
import { createGroup } from "./actions";

export const metadata = { title: "گروه‌ها" };

export default async function GroupsPage() {
  const v = await requireViewer(STAFF);
  const groups = await db.group.findMany({
    where: groupWhere(v),
    include: { coaches: { include: { user: { select: { name: true } } } }, slots: { orderBy: { weekday: "asc" } }, _count: { select: { athletes: true } } },
    orderBy: { name: "asc" },
  });
  return (
    <>
      <PageHeader title="گروه‌های تمرینی" subtitle={v.role === "COACH" ? "فقط گروه‌هایی که به شما سپرده شده‌اند" : undefined} />
      {groups.length === 0 ? <Empty title="گروهی در دسترس شما نیست" /> : (
        <div className="grid gap-3 md:grid-cols-2">
          {groups.map((g) => (
            <Link key={g.id} href={`/app/groups/${g.id}`} className="card hover:border-brand-200">
              <p className="font-bold">{g.name}</p>
              <p className="text-xs text-slate-500">{g.level} · {g.location}</p>
              <p className="mt-2 text-sm">مربی: {g.coaches.map((c) => c.user.name).join("، ") || "—"}</p>
              <p className="text-sm">ورزشکاران: {faNum(g._count.athletes)}</p>
              <p className="mt-1 text-xs text-slate-500">{g.slots.map((s) => `${WEEKDAY_LABEL[s.weekday]} ${faNum(s.startTime)}`).join(" · ") || "زمان‌بندی تعریف نشده"}</p>
            </Link>
          ))}
        </div>
      )}
      {v.role === "ADMIN" && (
        <ActionForm action={createGroup} className="card mt-6 grid gap-3 md:grid-cols-2" submitLabel="ایجاد گروه">
          <h2 className="font-bold md:col-span-2">گروه جدید</h2>
          <Field label="نام گروه" name="name" required />
          <Field label="سطح" name="level" />
          <Field label="محل تمرین" name="location" />
          <Field label="توضیحات" name="description" />
        </ActionForm>
      )}
    </>
  );
}
