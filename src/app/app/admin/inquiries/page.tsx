import { requireViewer } from "@/server/auth";
import { db } from "@/server/db";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { REQUEST_STATUS_LABEL } from "@/lib/domain/labels";
import { faDateTime, faNum } from "@/lib/domain/jalali";
import { setInquiryStatus } from "../actions";

export const metadata = { title: "درخواست‌های ثبت‌نام" };

export default async function Inquiries() {
  await requireViewer(["ADMIN", "HEAD_COACH"]);
  const items = await db.inquiryRequest.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }] });
  return (
    <>
      <PageHeader title="درخواست‌های ثبت‌نام و مشاوره" subtitle="از فرم وب‌سایت عمومی" />
      {items.length === 0 ? <Empty title="درخواستی ثبت نشده است" /> : (
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.id} className="card text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <p className="font-medium">{i.guardianName} — {i.kind === "REGISTRATION" ? "ثبت‌نام" : "مشاوره"} · شناگر {faNum(i.swimmerAge)} ساله</p>
                <Badge tone={i.status === "OPEN" ? "amber" : i.status === "CLOSED" ? "gray" : "blue"}>{REQUEST_STATUS_LABEL[i.status]}</Badge>
              </div>
              <p className="text-xs text-slate-500"><span dir="ltr">{i.phone}</span> {i.email && <span dir="ltr">· {i.email}</span>} · {faDateTime(i.createdAt)}</p>
              {i.experience && <p className="mt-1">سابقه: {i.experience}</p>}
              {i.message && <p className="mt-1">{i.message}</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                {(["IN_PROGRESS", "ANSWERED", "CLOSED"] as const).filter((s) => s !== i.status).map((s) => (
                  <form key={s} action={async () => { "use server"; await setInquiryStatus(i.id, s); }}><button className="btn-secondary btn-sm">{REQUEST_STATUS_LABEL[s]}</button></form>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
