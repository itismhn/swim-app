import { notFound } from "next/navigation";
import { getViewer, requireViewer } from "@/server/auth";
import { db } from "@/server/db";
import { canSeeNutritionAllergies, nutritionRequestWhere } from "@/server/authz";
import { ActionForm } from "@/components/ActionForm";
import { Badge, Field, PageHeader, Section } from "@/components/ui";
import { REQUEST_STATUS_LABEL } from "@/lib/domain/labels";
import { faDateTime } from "@/lib/domain/jalali";
import { assignNutrition, replyNutrition } from "../actions";

/** Title is loaded through the same scoped query, so it never reveals a record the viewer can't see. */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const v = await getViewer();
  if (!v) return {};
  const { id } = await params;
  const x = await db.nutritionRequest.findFirst({ where: { AND: [{ id }, nutritionRequestWhere(v)] }, select: { topic: true } });
  return { title: x?.topic ?? "یافت نشد" };
}

export default async function NutritionRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const v = await requireViewer(["ADMIN", "NUTRITIONIST", "ATHLETE", "GUARDIAN"]);
  const { id } = await params;
  const r = await db.nutritionRequest.findFirst({
    where: { AND: [{ id }, nutritionRequestWhere(v)] },
    include: {
      athlete: { select: { user: { select: { name: true } } } }, submittedBy: { select: { name: true } }, assignee: { select: { name: true } },
      replies: { include: { author: { select: { name: true, role: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!r) notFound();
  const nutritionists = v.role === "ADMIN" ? await db.user.findMany({ where: { role: "NUTRITIONIST", active: true }, select: { id: true, name: true } }) : [];
  const showAllergies = canSeeNutritionAllergies(v, r);

  return (
    <>
      <PageHeader title={r.topic} subtitle={<>{r.athlete.user.name} · ثبت توسط {r.submittedBy.name} · {faDateTime(r.createdAt)} <Badge>{REQUEST_STATUS_LABEL[r.status]}</Badge></>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <div className="card"><p className="text-xs text-slate-500">سؤال</p><p className="mt-1 whitespace-pre-wrap">{r.question}</p></div>
          {r.replies.map((m) => {
            const pro = m.author.role === "NUTRITIONIST";
            return (
              <div key={m.id} className={`card ${pro ? "border-emerald-200 bg-emerald-50/40" : ""}`}>
                {pro && <p className="mb-1 text-xs font-medium text-emerald-800">👩‍⚕️ توصیه فردی متخصص تغذیه — مخصوص همین ورزشکار</p>}
                <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                <p className="mt-2 text-xs text-slate-500">{m.author.name} · {faDateTime(m.createdAt)}</p>
              </div>
            );
          })}
          {v.role !== "ADMIN" && (
            <ActionForm action={replyNutrition.bind(null, r.id)} className="card space-y-2" resetOnSuccess submitLabel="ارسال">
              <Field label={v.role === "NUTRITIONIST" ? "پاسخ / راهنمایی فردی" : "پیام تکمیلی"} name="body" as="textarea" rows={4} />
              {v.role === "NUTRITIONIST" && <p className="text-xs text-slate-500">یادآوری: برای ورزشکاران نوجوان، رژیم محدودکننده، شمارش کالری یا هدف کاهش وزن تجویز نشود مگر با ارزیابی بالینی و رضایت سرپرست.</p>}
            </ActionForm>
          )}
        </div>
        <div className="space-y-3">
          <Section title="🔒 اطلاعات محرمانه">
            {!r.guardianConsent ? <p className="text-sm text-slate-500">اطلاعات حساسی با رضایت سرپرست ثبت نشده است.</p>
              : showAllergies ? <p className="text-sm">حساسیت غذایی: {r.allergies}</p>
              : <p className="text-sm text-slate-500">فقط برای متخصص ارجاع‌شده و خانواده قابل مشاهده است.</p>}
          </Section>
          {v.role === "ADMIN" && (
            <Section title="ارجاع به متخصص">
              <p className="mb-2 text-sm">فعلی: {r.assignee?.name ?? "—"}</p>
              <ActionForm action={assignNutrition.bind(null, r.id)} submitLabel="ارجاع" submitClassName="btn-secondary btn-sm">
                <Field label="متخصص تغذیه" name="assigneeId" as="select">{nutritionists.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}</Field>
              </ActionForm>
            </Section>
          )}
        </div>
      </div>
    </>
  );
}
