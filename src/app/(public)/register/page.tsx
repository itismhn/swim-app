import { ActionForm } from "@/components/ActionForm";
import { Field } from "@/components/ui";
import { submitInquiry } from "./actions";
export const metadata = { title: "درخواست ثبت‌نام یا مشاوره" };

export default function Register() {
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-bold">درخواست ثبت‌نام یا مشاوره اولیه</h1>
      <p className="mt-2 text-sm text-slate-600">فقط اطلاعات ضروری برای تماس را وارد کنید. اطلاعات پزشکی را در این فرم ننویسید.</p>
      <ActionForm action={submitInquiry} className="card mt-6 space-y-4" resetOnSuccess submitLabel="ارسال درخواست">
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
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="consent" className="mt-1 size-4" />
          <span>موافقم اطلاعات بالا فقط برای تماس و هماهنگی ثبت‌نام استفاده شود.</span>
        </label>
        <p data-error-for="consent" hidden className="text-xs text-rose-600" />
      </ActionForm>
    </div>
  );
}
