"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { login, logout } from "@/server/auth";
import { fromZod, formObject, type ActionResult } from "@/lib/action";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("ایمیل معتبر نیست"),
  password: z.string().min(1, "رمز عبور الزامی است").max(200),
});

export async function loginAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = schema.safeParse(formObject(fd));
  if (!p.success) return fromZod(p.error);
  const r = await login(p.data.email, p.data.password);
  if (!r.ok) return { ok: false, message: r.error };
  redirect("/app");
}

export async function logoutAction() {
  await logout();
  redirect("/login");
}
