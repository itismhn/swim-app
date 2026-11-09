import { z } from "zod";
import { parseJalaliDate } from "./domain/jalali";
import { toLatinDigits } from "./domain/performance";

export const req = (label = "این فیلد") => z.string({ required_error: `${label} الزامی است` }).trim().min(1, `${label} الزامی است`);
export const opt = z.string().trim().optional().transform((s) => (s ? s : null));
export const int = (label: string, min = 0, max = 100000) =>
  z.preprocess(
    (v) => (typeof v === "string" ? (v.trim() === "" ? undefined : Number(toLatinDigits(v))) : v),
    z.number({ required_error: `${label} الزامی است`, invalid_type_error: `${label} باید عدد باشد` }).int(`${label} باید عدد صحیح باشد`).min(min, `${label} حداقل ${min}`).max(max, `${label} حداکثر ${max}`),
  );
export const optInt = (label: string, min = 0, max = 100000) =>
  z.preprocess((v) => (v === "" || v == null ? null : Number(toLatinDigits(String(v)))), z.number({ invalid_type_error: `${label} باید عدد باشد` }).int().min(min).max(max).nullable());
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
