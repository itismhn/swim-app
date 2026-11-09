import { NextResponse, type NextRequest } from "next/server";

/** Only redirects anonymous visitors away from /app. Real authorization happens in the data layer. */
export function middleware(req: NextRequest) {
  if (!req.cookies.get("swim_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
export const config = { matcher: ["/app/:path*"] };
