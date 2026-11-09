import { AutoRefresh } from "@/components/AutoRefresh";
import Link from "next/link";
import { requireViewer } from "@/server/auth";
import { db } from "@/server/db";
import { messageableUsers, threadWhere } from "@/server/authz";
import { ActionForm } from "@/components/ActionForm";
import { Empty, Field, PageHeader, Section } from "@/components/ui";
import { faDateTime } from "@/lib/domain/jalali";
import { startThread } from "./actions";

export const metadata = { title: "پیام‌ها" };

export default async function Messages() {
  const v = await requireViewer();
  const [threads, contacts] = await Promise.all([
    db.thread.findMany({
      where: threadWhere(v),
      include: {
        participants: { include: { user: { select: { name: true } } } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, include: { author: { select: { name: true } } } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    messageableUsers(v),
  ]);
  return (
    <>
      <AutoRefresh seconds={20} />
      <PageHeader title="پیام‌ها" subtitle="گفتگوهای مربوط به ورزشکاران زیر ۱۸ سال با حضور سرپرست تأییدشده انجام می‌شود (قابل تنظیم توسط مدیر)." />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {threads.length === 0 ? <Empty title="هنوز گفتگویی ندارید" /> : (
            <ul className="space-y-2">
              {threads.map((t) => {
                const me = t.participants.find((p) => p.userId === v.id);
                const last = t.messages[0];
                const unread = last && last.authorId !== v.id && (!me?.lastReadAt || last.createdAt > me.lastReadAt);
                return (
                  <li key={t.id}>
                    <Link href={`/app/messages/${t.id}`} className={`card block hover:border-brand-200 ${unread ? "border-brand-500" : ""}`}>
                      <div className="flex justify-between gap-2">
                        <p className={unread ? "font-bold" : "font-medium"}>{unread && <span className="me-1 inline-block size-2 rounded-full bg-brand-600" aria-label="خوانده‌نشده" />}{t.subject}</p>
                        {last && <span className="text-xs text-slate-500">{faDateTime(last.createdAt)}</span>}
                      </div>
                      <p className="text-xs text-slate-500">{t.participants.filter((p) => p.userId !== v.id).map((p) => p.user.name + (p.oversight ? " (ناظر)" : "")).join("، ")}</p>
                      {last && <p className="mt-1 truncate text-sm text-slate-600">{last.author.name}: {last.body}</p>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <Section title="گفتگوی جدید">
          {contacts.length === 0 ? <p className="text-sm text-slate-500">مخاطبی برای شما تعریف نشده است.</p> : (
            <ActionForm action={startThread} className="space-y-3" submitLabel="ارسال">
              <Field label="گیرنده" name="to" as="select">{contacts.map((c) => <option key={`${c.userId}|${c.athleteId}`} value={`${c.userId}|${c.athleteId}`}>{c.name}</option>)}</Field>
              <Field label="موضوع" name="subject" />
              <Field label="پیام" name="body" as="textarea" rows={4} />
            </ActionForm>
          )}
        </Section>
      </div>
    </>
  );
}
