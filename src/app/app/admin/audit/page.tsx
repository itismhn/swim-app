import { requireViewer } from "@/server/auth";
import { db } from "@/server/db";
import { Empty, PageHeader } from "@/components/ui";
import { faDateTime } from "@/lib/domain/jalali";

export const metadata = { title: "گزارش ممیزی" };

export default async function Audit({ searchParams }: { searchParams: Promise<{ entity?: string }> }) {
  await requireViewer(["ADMIN"]);
  const { entity } = await searchParams;
  const [rows, entities] = await Promise.all([
    db.auditLog.findMany({ where: entity ? { entity } : {}, include: { actor: { select: { name: true } } }, orderBy: { at: "desc" }, take: 200 }),
    db.auditLog.findMany({ distinct: ["entity"], select: { entity: true } }),
  ]);
  return (
    <>
      <PageHeader title="گزارش ممیزی" subtitle="۲۰۰ رویداد اخیر تغییرات حساس" />
      <form className="card mb-4 flex gap-2">
        <select name="entity" defaultValue={entity ?? ""} className="input w-auto" aria-label="نوع"><option value="">همه</option>{entities.map((e) => <option key={e.entity}>{e.entity}</option>)}</select>
        <button className="btn-secondary">فیلتر</button>
      </form>
      {rows.length === 0 ? <Empty title="رویدادی ثبت نشده است" /> : (
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead><tr><th>زمان</th><th>کاربر</th><th>عملیات</th><th>موجودیت</th><th>جزئیات</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap text-xs">{faDateTime(r.at)}</td>
                  <td>{r.actor?.name ?? "سیستم"}</td>
                  <td dir="ltr" className="text-start font-mono text-xs">{r.action}</td>
                  <td dir="ltr" className="text-start font-mono text-xs">{r.entity}</td>
                  <td>
                    <details><summary className="cursor-pointer text-xs text-brand-600 dark:text-brand-400">نمایش</summary>
                      <pre dir="ltr" className="mt-1 max-w-md overflow-x-auto whitespace-pre-wrap text-start text-[11px]">{JSON.stringify({ before: r.before, after: r.after }, null, 1)}</pre>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
