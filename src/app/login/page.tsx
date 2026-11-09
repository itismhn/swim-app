import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { Field } from "@/components/ui";
import { getViewer } from "@/server/auth";
import { loginAction } from "./actions";

export const metadata = { title: "ورود" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getViewer()) redirect("/app");
  return (
    <div className="grid min-h-dvh place-items-center bg-gradient-to-b from-brand-50 to-white px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 block text-center text-sm text-brand-600">← بازگشت به وب‌سایت</Link>
        <ActionForm action={loginAction} className="card space-y-4" submitLabel="ورود" submitClassName="btn-primary w-full">
          <h1 className="text-xl font-bold">ورود به سامانه آکادمی</h1>
          <Field label="ایمیل" name="email" type="email" dir="ltr" required />
          <Field label="رمز عبور" name="password" type="password" dir="ltr" required />
        </ActionForm>
        {process.env.NODE_ENV !== "production" && (
          <div className="card mt-4 text-xs leading-6 text-slate-600">
            <p className="font-medium text-amber-700">حساب‌های نمونه (فقط محیط توسعه)</p>
            <p dir="ltr" className="text-start">admin@ · head@ · coach1@ · coach2@ · nutrition@ · athlete1@ · parent1@ … example.com</p>
            <p>رمز عبور: مقدار SEED_DEMO_PASSWORD در فایل ‎.env</p>
          </div>
        )}
      </div>
    </div>
  );
}
