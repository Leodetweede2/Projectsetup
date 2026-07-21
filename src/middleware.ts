import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

/**
 * Coarse-grained gating based on the presence of the session cookie.
 *
 * This is a fast first pass only — it cannot validate the session against the
 * database (middleware runs on the Edge runtime). Real authentication and all
 * permission checks happen in server components/actions via the guards in
 * src/lib/auth/guards.ts.
 */
const PROTECTED_PREFIXES = ["/dashboard", "/profile", "/settings", "/account", "/admin", "/find", "/list", "/map"];
const AUTH_PAGES = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (isProtected && !hasSession) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (hasSession && AUTH_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*", "/settings/:path*", "/account/:path*", "/admin/:path*", "/find/:path*", "/list/:path*", "/map/:path*", "/login", "/register"],
};
