import { ZodError } from "zod";
import "./zod-fa"; // installs the Persian zod error map

/** Uniform result returned by every server action, consumed by <ActionForm>. */
export type ActionResult = { ok: boolean; message?: string; fieldErrors?: Record<string, string>; redirectTo?: string; data?: Record<string, unknown> } | null;

export function fromZod(e: ZodError): ActionResult {
  const fieldErrors: Record<string, string> = {};
  for (const i of e.issues) fieldErrors[i.path.join(".")] ??= i.message;
  return { ok: false, message: "لطفاً خطاهای فرم را برطرف کنید.", fieldErrors };
}

export const formObject = (fd: FormData) => {
  const o: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (k.startsWith("$ACTION")) continue;
    if (k in o) o[k] = ([] as unknown[]).concat(o[k], v);
    else o[k] = v;
  }
  return o;
};
