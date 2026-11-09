import "server-only";
import { ZodError } from "zod";
import { fromZod, type ActionResult } from "@/lib/action";
import { getViewer } from "./auth";
import { ForbiddenError, type Viewer } from "./viewer";
import { rateLimit } from "./rate-limit";
import type { Role } from "@prisma/client";

/**
 * Wraps a server action: requires a session (and optionally a role), converts
 * validation and authorization errors into a user-facing ActionResult.
 */
export function guarded<A extends unknown[]>(
  roles: Role[] | null,
  fn: (v: Viewer, ...args: A) => Promise<ActionResult>,
) {
  return async (...args: A): Promise<ActionResult> => {
    const v = await getViewer();
    if (!v) return { ok: false, message: "نشست شما منقضی شده است. دوباره وارد شوید." };
    if (roles && !roles.includes(v.role)) return { ok: false, message: "دسترسی مجاز نیست." };
    // 120 mutations per user per minute is far above normal use (a full attendance sheet is one call).
    if (!rateLimit(`action:${v.id}`, 120, 60_000).ok) return { ok: false, message: "درخواست‌های زیادی ارسال شده است. یک دقیقه دیگر تلاش کنید." };
    try {
      return await fn(v, ...args);
    } catch (e) {
      if (e instanceof ZodError) return fromZod(e);
      if (e instanceof ForbiddenError) return { ok: false, message: e.message };
      console.error(e);
      return { ok: false, message: "خطای غیرمنتظره رخ داد. دوباره تلاش کنید." };
    }
  };
}
