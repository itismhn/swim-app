import { Eye } from "lucide-react";
import { AutoRefresh } from "@/components/AutoRefresh";
import { notFound } from "next/navigation";
import { getViewer, requireViewer } from "@/server/auth";
import { db } from "@/server/db";
import { threadWhere } from "@/server/authz";
import { ActionForm } from "@/components/ActionForm";
import { PageHeader } from "@/components/ui";
import { faDateTime } from "@/lib/domain/jalali";
import { ROLE_LABEL } from "@/lib/domain/labels";
import { sendMessage } from "../actions";

/** Title is loaded through the same scoped query, so it never reveals a record the viewer can't see. */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const v = await getViewer();
  if (!v) return {};
  const { id } = await params;
  const x = await db.thread.findFirst({ where: { AND: [{ id }, threadWhere(v)] }, select: { subject: true } });
  return { title: x?.subject ?? "یافت نشد" };
}

export default async function Thread({ params }: { params: Promise<{ id: string }> }) {
  const v = await requireViewer();
  const { id } = await params;
  const t = await db.thread.findFirst({
    where: { AND: [{ id }, threadWhere(v)] },
    include: {
      participants: { include: { user: { select: { name: true, role: true } } } },
      messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true, role: true } } } },
    },
  });
  if (!t) notFound();
  await db.threadParticipant.update({ where: { threadId_userId: { threadId: id, userId: v.id } }, data: { lastReadAt: new Date() } });
  await db.notification.updateMany({ where: { userId: v.id, link: `/app/messages/${id}`, readAt: null }, data: { readAt: new Date() } });
  const oversight = t.participants.filter((p) => p.oversight);

  return (
    <>
      <AutoRefresh seconds={10} />
      <PageHeader title={t.subject} subtitle={t.participants.map((p) => `${p.user.name} (${ROLE_LABEL[p.user.role]})`).join("، ")} />
      {oversight.length > 0 && <p className="mb-3 flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-800"><Eye aria-hidden className="inline size-3.5 shrink-0 align-[-2px]" /> نظارت سرپرست فعال است: {oversight.map((p) => p.user.name).join("، ")} همه پیام‌ها را می‌بیند.</p>}
      <ul className="space-y-2">
        {t.messages.map((m) => {
          const mine = m.authorId === v.id;
          return (
            <li key={m.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2 ${mine ? "bg-brand-600 text-white" : "border border-slate-200 bg-surface"}`}>
                <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                <p className={`mt-1 text-[11px] ${mine ? "text-brand-100" : "text-slate-500"}`}>{m.author.name} · {faDateTime(m.createdAt)}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <ActionForm action={sendMessage.bind(null, id)} className="card mt-4 flex items-end gap-2" resetOnSuccess submitLabel="ارسال">
        <textarea name="body" rows={2} className="input flex-1" placeholder="پیام خود را بنویسید…" aria-label="متن پیام" />
      </ActionForm>
    </>
  );
}
