import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Role } from "@prisma/client";
import { db } from "./db";
import { verifyPassword } from "./password";
import type { Viewer } from "./viewer";
import { clientIp, rateLimit, resetRateLimit } from "./rate-limit";

export const SESSION_COOKIE = "swim_session";
const TTL_HOURS = Number(process.env.SESSION_TTL_HOURS || 72);

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

const LOCK_MS = 10 * 60 * 1000;

export async function login(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = email.toLowerCase();
  const h = await headers();
  // Throttle per account (5 / 10 min) and per IP (30 / 10 min) to slow password guessing.
  const tooMany = "به دلیل تلاش‌های ناموفق متعدد، چند دقیقه دیگر دوباره تلاش کنید.";
  if (!rateLimit(`login-ip:${clientIp(h)}`, 30, LOCK_MS).ok) return { ok: false, error: tooMany };
  const user = await db.user.findUnique({ where: { email: key } });
  // Always run bcrypt to keep timing similar whether or not the user exists.
  const valid = await verifyPassword(password, user?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva");
  if (!user || !valid || !user.active) {
    return { ok: false, error: rateLimit(`login:${key}`, 5, LOCK_MS).ok ? "ایمیل یا رمز عبور نادرست است." : tooMany };
  }
  if (!rateLimit(`login:${key}`, 5, LOCK_MS).ok) return { ok: false, error: tooMany };
  resetRateLimit(`login:${key}`);
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TTL_HOURS * 3600 * 1000);
  const ua = h.get("user-agent")?.slice(0, 200) ?? null;
  await db.session.create({ data: { tokenHash: sha256(token), userId: user.id, expiresAt, userAgent: ua } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return { ok: true };
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

export const getViewer = cache(async (): Promise<Viewer | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const s = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { select: { id: true, role: true, name: true, active: true } } },
  });
  if (!s || s.expiresAt < new Date() || !s.user.active) return null;
  return { id: s.user.id, role: s.user.role, name: s.user.name };
});

/** For pages: redirects to login when unauthenticated, and to /app when the role is not allowed. */
export async function requireViewer(roles?: Role[]): Promise<Viewer> {
  const v = await getViewer();
  if (!v) redirect("/login");
  if (roles && !roles.includes(v.role)) redirect("/app?denied=1");
  return v;
}

/** Hash of the current session token, used to keep this session when revoking others. */
export async function currentSessionHash(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? sha256(token) : null;
}
