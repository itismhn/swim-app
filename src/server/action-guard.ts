import "server-only";
import { ZodError } from "zod";
import { fromZod, type ActionResult } from "@/lib/action";
import { getViewer } from "./auth";
import { ForbiddenError, type Viewer } from "./viewer";
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
