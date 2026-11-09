import { db } from "@/server/db";
export const metadata = { title: "سؤالات متداول" };

export default async function Faq() {
  const faqs = await db.faq.findMany({ orderBy: { order: "asc" } });
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold">سؤالات متداول</h1>
      <div className="mt-6 space-y-3">
        {faqs.map((f) => (
          <details key={f.id} className="card group">
            <summary className="cursor-pointer list-none font-medium marker:hidden">
              <span className="me-2 text-brand-600 group-open:hidden">+</span><span className="me-2 hidden text-brand-600 group-open:inline">−</span>{f.question}
            </summary>
            <p className="mt-3 text-sm leading-7 text-slate-600">{f.answer}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
