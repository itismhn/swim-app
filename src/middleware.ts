import { NextResponse, type NextRequest } from "next/server";

/**
 * 1. Sets a strict, nonce-based Content-Security-Policy on every page.
 *    Next.js reads the nonce from the request's CSP header and applies it to its own scripts.
 * 2. Redirects anonymous visitors away from /app. (Real authorization happens in the data layer.)
 */
export function middleware(req: NextRequest) {
  const isApp = req.nextUrl.pathname.startsWith("/app");
  if (isApp && !req.cookies.get("swim_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const nonce = btoa(crypto.randomUUID());
  const dev = process.env.NODE_ENV !== "production";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'", // inline style attributes (charts, progress bars)
    "img-src 'self' data: blob:",
    "media-src 'self'",
    "font-src 'self'",
    `connect-src 'self'${dev ? " ws:" : ""}`,
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    // Only when served over HTTPS (directly or via a TLS proxy); on plain HTTP it would break asset loading.
    ...(req.headers.get("x-forwarded-proto") === "https" || req.nextUrl.protocol === "https:" ? ["upgrade-insecure-requests"] : []),
  ].join("; ");

  const headers = new Headers(req.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const res = NextResponse.next({ request: { headers } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export const config = {
  matcher: [{ source: "/((?!_next/static|_next/image|favicon.ico|api/).*)", missing: [{ type: "header", key: "next-router-prefetch" }] }],
};
