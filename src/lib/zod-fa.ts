import { z } from "zod";
import { parseJalaliDate } from "./domain/jalali";
import { toLatinDigits } from "./domain/performance";

const fa = (n: number) => n.toLocaleString("fa-IR", { useGrouping: false });

/** Persian fallback for every zod issue that has no explicit message (explicit messages still win). */
z.setErrorMap((issue, ctx) => {
  const n = (v: unknown) => fa(Number(v));
  switch (issue.code) {
    case "invalid_type":
      return { message: issue.received === "undefined" || issue.received === "null" ? "این فیلد الزامی است" : "مقدار واردشده نامعتبر است" };
    case "too_small":
      if (issue.type === "string") return { message: Number(issue.minimum) <= 1 ? "این فیلد الزامی است" : `حداقل ${n(issue.minimum)} کاراکتر لازم است` };
      if (issue.type === "array") return { message: `حداقل ${n(issue.minimum)} مورد لازم است` };
      return { message: `مقدار باید حداقل ${n(issue.minimum)} باشد` };
    case "too_big":
      if (issue.type === "string") return { message: `حداکثر ${n(issue.maximum)} کاراکتر مجاز است` };
      if (issue.type === "array") return { message: `حداکثر ${n(issue.maximum)} مورد مجاز است` };
      return { message: `مقدار باید حداکثر ${n(issue.maximum)} باشد` };
    case "invalid_string":
      return { message: issue.validation === "email" ? "ایمیل معتبر نیست" : "قالب واردشده نامعتبر است" };
    case "invalid_enum_value":
      return { message: "گزینه انتخاب‌شده نامعتبر است" };
    case "not_multiple_of":
      return { message: "مقدار باید عدد صحیح باشد" };
  }
  return { message: ctx.defaultError };
});

export const req = (label = "این فیلد") => z.string({ required_error: `${label} الزامی است` }).trim().min(1, `${label} الزامی است`);
export const opt = z.string().trim().optional().transform((s) => (s ? s : null));
export const int = (label: string, min = 0, max = 100000) =>
  z.preprocess(
    (v) => (typeof v === "string" ? (v.trim() === "" ? undefined : Number(toLatinDigits(v))) : v),
    z.number({ required_error: `${label} الزامی است`, invalid_type_error: `${label} باید عدد باشد` }).int(`${label} باید عدد صحیح باشد`).min(min, `${label} حداقل ${fa(min)}`).max(max, `${label} حداکثر ${fa(max)}`),
  );
export const optInt = (label: string, min = 0, max = 100000) =>
  z.preprocess((v) => (v === "" || v == null ? null : Number(toLatinDigits(String(v)))), z.number({ invalid_type_error: `${label} باید عدد باشد` }).int(`${label} باید عدد صحیح باشد`).min(min, `${label} حداقل ${fa(min)}`).max(max, `${label} حداکثر ${fa(max)}`).nullable());
export const jalaliDate = (label = "تاریخ") =>
  z.string({ required_error: `${label} الزامی است` }).transform((s, ctx) => {
    const d = parseJalaliDate(s);
    if (!d) {
      ctx.addIssue({ code: "custom", message: `${label} نامعتبر است (مثال: ۱۴۰۵/۰۸/۱۸)` });
      return z.NEVER;
    }
    return d;
  });
export const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());
export const phone = z.string().trim().transform(toLatinDigits).pipe(z.string().regex(/^0\d{10}$/, "شماره تلفن همراه معتبر نیست (مثال: 09121234567)"));
