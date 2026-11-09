import { requireViewer } from "@/server/auth";
import { db } from "@/server/db";
import { ActionForm } from "@/components/ActionForm";
import { Field, PageHeader, Section } from "@/components/ui";
import { addPublicItem, deletePublicItem } from "../actions";

export const metadata = { title: "محتوای عمومی" };

const Del = ({ kind, id }: { kind: "faq" | "program" | "coach"; id: string }) => (
  <form action={async () => { "use server"; await deletePublicItem(kind, id); }}><button className="text-xs text-rose-600">حذف</button></form>
);

export default async function Content() {
  await requireViewer(["ADMIN"]);
  const [faqs, programs, coaches] = await Promise.all([
    db.faq.findMany({ orderBy: { order: "asc" } }), db.program.findMany({ orderBy: { order: "asc" } }), db.publicCoachProfile.findMany({ orderBy: { order: "asc" } }),
  ]);
  return (
    <>
      <PageHeader title="محتوای وب‌سایت عمومی" subtitle="هیچ اطلاعات خصوصی ورزشکاران، خانواده‌ها یا عملکرد فردی در این بخش وارد نکنید." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="مربیان (نمایه عمومی)">
          <ul className="space-y-1 text-sm">{coaches.map((c) => <li key={c.id} className="flex justify-between">{c.name} — {c.title}<Del kind="coach" id={c.id} /></li>)}</ul>
          <ActionForm action={addPublicItem.bind(null, "coach")} className="mt-3 space-y-2" resetOnSuccess submitLabel="افزودن" submitClassName="btn-secondary btn-sm">
            <Field label="نام" name="name" /><Field label="عنوان" name="title" /><Field label="معرفی" name="bio" as="textarea" /><input type="hidden" name="order" value="9" />
          </ActionForm>
        </Section>
        <Section title="برنامه‌ها و خدمات">
          <ul className="space-y-1 text-sm">{programs.map((p) => <li key={p.id} className="flex justify-between">{p.title}<Del kind="program" id={p.id} /></li>)}</ul>
          <ActionForm action={addPublicItem.bind(null, "program")} className="mt-3 space-y-2" resetOnSuccess submitLabel="افزودن" submitClassName="btn-secondary btn-sm">
            <Field label="عنوان" name="title" /><Field label="توضیح" name="description" as="textarea" /><input type="hidden" name="order" value="9" />
          </ActionForm>
        </Section>
        <Section title="سؤالات متداول">
          <ul className="space-y-1 text-sm">{faqs.map((f) => <li key={f.id} className="flex justify-between gap-2">{f.question}<Del kind="faq" id={f.id} /></li>)}</ul>
          <ActionForm action={addPublicItem.bind(null, "faq")} className="mt-3 space-y-2" resetOnSuccess submitLabel="افزودن" submitClassName="btn-secondary btn-sm">
            <Field label="سؤال" name="question" /><Field label="پاسخ" name="answer" as="textarea" /><input type="hidden" name="order" value="9" />
          </ActionForm>
        </Section>
      </div>
    </>
  );
}
