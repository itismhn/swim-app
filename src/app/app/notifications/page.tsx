import Link from "next/link";
import { requireViewer } from "@/server/auth";
import { db } from "@/server/db";
import { Empty, PageHeader } from "@/components/ui";
import { faDateTime } from "@/lib/domain/jalali";
import { externalChannelsStatus } from "@/server/notify-external";
import { markAllRead, markRead } from "./actions";

export const metadata = { title: "اعلان‌ها" };

export default async function Notifications() {
  const v = await requireViewer();
  const items = await db.notification.findMany({ where: { userId: v.id }, orderBy: { createdAt: "desc" }, take: 100 });
  const ext = externalChannelsStatus();
  return (
    <>
      <PageHeader
        title="اعلان‌ها"
        subtitle={`اعلان‌ها فقط داخل سامانه ارسال می‌شوند. پیامک: ${ext.sms.configured ? "فعال" : "پیکربندی نشده"} · ایمیل: ${ext.email.configured ? "فعال" : "پیکربندی نشده"}`}
        actions={items.some((i) => !i.readAt) && <form action={async () => { "use server"; await markAllRead(); }}><button className="btn-secondary btn-sm">علامت‌گذاری همه به‌عنوان خوانده‌شده</button></form>}
      />
      {items.length === 0 ? <Empty title="اعلانی ندارید" /> : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id} className={`card flex items-start justify-between gap-3 ${n.readAt ? "opacity-70" : "border-brand-200"}`}>
              <div>
                <p className={n.readAt ? "" : "font-bold"}>{!n.readAt && <span className="me-1 inline-block size-2 rounded-full bg-brand-600" aria-label="خوانده‌نشده" />}{n.title}</p>
                {n.body && <p className="text-sm text-slate-600">{n.body}</p>}
                <p className="mt-1 text-xs text-slate-500">{faDateTime(n.createdAt)}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {n.link && <Link href={n.link} className="btn-secondary btn-sm">مشاهده</Link>}
                {!n.readAt && <form action={async () => { "use server"; await markRead(n.id); }}><button className="text-xs text-brand-600">خوانده شد</button></form>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
