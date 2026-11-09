import Link from "next/link";
import { requireViewer } from "@/server/auth";
import { db } from "@/server/db";
import { athleteWhere, nutritionRequestWhere } from "@/server/authz";
import { ActionForm } from "@/components/ActionForm";
import { Badge, Empty, Field, PageHeader, Section } from "@/components/ui";
import { REQUEST_STATUS_LABEL } from "@/lib/domain/labels";
import { faDateTime } from "@/lib/domain/jalali";
import { publishArticle, submitNutritionRequest } from "./actions";

export const metadata = { title: "تغذیه ورزشی" };

export default async function Nutrition() {
  const v = await requireViewer(["ADMIN", "NUTRITIONIST", "ATHLETE", "GUARDIAN"]);
  const canAsk = v.role === "ATHLETE" || v.role === "GUARDIAN";
  const [articles, requests, athletes] = await Promise.all([
    db.nutritionArticle.findMany({ where: { published: true }, orderBy: { createdAt: "desc" } }),
    db.nutritionRequest.findMany({ where: nutritionRequestWhere(v), include: { athlete: { select: { user: { select: { name: true } } } }, assignee: { select: { name: true } } }, orderBy: { createdAt: "desc" } }),
    canAsk ? db.athlete.findMany({ where: athleteWhere(v), select: { id: true, user: { select: { name: true } } } }) : [],
  ]);
  return (
    <>
      <PageHeader title="تغذیه ورزشی" subtitle="محتوای آموزشی عمومی، جدا از مشاوره فردی متخصص. ردیابی کالری، رژیم محدودکننده یا هدف کاهش وزن در این سامانه فعال نیست." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="📚 آموزش عمومی تغذیه">
          <p className="mb-3 rounded-lg bg-slate-100 p-2 text-xs text-slate-600">این مطالب عمومی‌اند و جایگزین توصیه فردی متخصص نیستند.</p>
          <div className="space-y-2">
            {articles.map((a) => (
              <details key={a.id} className="rounded-xl border border-slate-100 p-3">
                <summary className="cursor-pointer font-medium">{a.title} <span className="text-xs font-normal text-slate-500">— {a.summary}</span></summary>
                <p className="mt-2 text-sm leading-7">{a.body}</p>
              </details>
            ))}
          </div>
          {(v.role === "NUTRITIONIST" || v.role === "ADMIN") && (
            <details className="mt-3">
              <summary className="btn-secondary btn-sm cursor-pointer">+ مطلب آموزشی جدید</summary>
              <ActionForm action={publishArticle} className="mt-3 space-y-3" resetOnSuccess submitLabel="انتشار">
                <Field label="عنوان" name="title" /><Field label="خلاصه" name="summary" /><Field label="متن" name="body" as="textarea" rows={5} />
              </ActionForm>
            </details>
          )}
        </Section>

        <Section title={v.role === "NUTRITIONIST" ? "درخواست‌های ارجاع‌شده به شما" : "درخواست‌های مشاوره"}>
          {requests.length === 0 ? <Empty title="درخواستی نیست" /> : (
            <ul className="space-y-2">
              {requests.map((r) => (
                <li key={r.id}>
                  <Link href={`/app/nutrition/${r.id}`} className="block rounded-xl border border-slate-100 p-3 hover:border-brand-200">
                    <div className="flex justify-between gap-2"><p className="font-medium">{r.topic}</p><Badge tone={r.status === "ANSWERED" ? "green" : r.status === "OPEN" ? "amber" : "blue"}>{REQUEST_STATUS_LABEL[r.status]}</Badge></div>
                    <p className="text-xs text-slate-500">{r.athlete.user.name} · {faDateTime(r.createdAt)} · متخصص: {r.assignee?.name ?? "ارجاع نشده"}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {canAsk && athletes.length > 0 && (
            <details className="mt-3" open={requests.length === 0}>
              <summary className="btn-primary btn-sm cursor-pointer">+ درخواست مشاوره</summary>
              <ActionForm action={submitNutritionRequest} className="mt-3 space-y-3" submitLabel="ارسال درخواست">
                <Field label="ورزشکار" name="athleteId" as="select">{athletes.map((a) => <option key={a.id} value={a.id}>{a.user.name}</option>)}</Field>
                <Field label="موضوع" name="topic" placeholder="مثلاً: تغذیه روز مسابقه" />
                <Field label="سؤال" name="question" as="textarea" />
                <fieldset className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                  <legend className="px-1 text-xs font-medium text-amber-900">🔒 اطلاعات حساس (اختیاری)</legend>
                  <Field label="حساسیت غذایی" name="allergies" hint={v.role === "ATHLETE" ? "برای ورزشکاران زیر ۱۸ سال، این مورد را سرپرست ثبت می‌کند." : "فقط متخصص ارجاع‌شده آن را می‌بیند."} />
                  <label className="mt-2 flex items-start gap-2 text-xs"><input type="checkbox" name="consent" className="mt-0.5" /> به‌عنوان سرپرست، با ثبت و دسترسی محدود به این اطلاعات موافقم.</label>
                </fieldset>
              </ActionForm>
            </details>
          )}
        </Section>
      </div>
    </>
  );
}
