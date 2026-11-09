import { ActionForm } from "@/components/ActionForm";
import { Field } from "@/components/ui";
import { ShieldCheck } from "lucide-react";
import { PageHero } from "../shared";
import { submitInquiry } from "./actions";
export const metadata = { title: "درخواست ثبت‌نام یا مشاوره" };

export default function Register() {
  return (
    <>
    <PageHero eyebrow="ثبت‌نام" title="درخواست ثبت‌نام یا مشاوره اولیه">فرم کوتاه زیر را تکمیل کنید؛ همکاران ما برای هماهنگی ارزیابی ورودی با شما تماس می‌گیرند.</PageHero>
    <div className="mx-auto max-w-2xl px-4 py-12">
      <p className="mb-4 flex items-start gap-2 rounded-xl border border-brand-200 bg-brand-50 p-3.5 text-sm text-brand-900"><ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />فقط اطلاعات ضروری برای تماس را وارد کنید. اطلاعات پزشکی را در این فرم ننویسید.</p>
      <ActionForm action={submitInquiry} className="card space-y-5 p-6 md:p-8" resetOnSuccess submitLabel="ارسال درخواست" submitClassName="btn-primary h-12 w-full sm:w-auto sm:px-8">
        <Field label="نوع درخواست" name="kind" as="select" defaultValue="REGISTRATION">
          <option value="REGISTRATION">ثبت‌نام / ارزیابی ورودی</option>
          <option value="CONSULTATION">مشاوره اولیه</option>
        </Field>
        <Field label="نام و نام خانوادگی سرپرست" name="guardianName" required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="تلفن همراه" name="phone" required inputMode="tel" dir="ltr" placeholder="09xxxxxxxxx" />
          <Field label="ایمیل (اختیاری)" name="email" type="email" dir="ltr" />
        </div>
        <Field label="سن شناگر" name="swimmerAge" required inputMode="numeric" />
        <Field label="سابقه شنا (اختیاری)" name="experience" placeholder="مثلاً: دو سال کلاس، شرکت در مسابقات باشگاهی" />
        <Field label="توضیحات (اختیاری)" name="message" as="textarea" />
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-sm">
          <input type="checkbox" name="consent" className="mt-1 size-4" />
          <span>موافقم اطلاعات بالا فقط برای تماس و هماهنگی ثبت‌نام استفاده شود.</span>
        </label>
        <p data-error-for="consent" hidden className="text-xs text-rose-600" />
      </ActionForm>
    </div>
    </>
  );
}
