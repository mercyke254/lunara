import { NextResponse, type NextRequest } from "next/server";

/**
 * Request-boundary proxy (Next.js 16's replacement for `middleware.ts`).
 *
 * SCOPE AND LIMITS - this is a UX optimisation, NOT the security boundary.
 *
 * It can only see whether a session cookie is *present*; validating it requires
 * a database lookup, which does not belong at the edge on every request. So it
 * performs two cheap jobs:
 *   1. send obviously-unauthenticated visitors to sign-in, instead of rendering
 *      a shell that then flashes into a redirect
 *   2. keep signed-in users away from the sign-in / registration screens
 *
 * The REAL enforcement lives in `(app)/layout.tsx` (which resolves the session
 * against the database and redirects), and in every server action and route
 * handler (which re-derive the user and scope all queries by that id). A forged
 * cookie therefore gets past this file and is rejected immediately after.
 */

const SESSION_COOKIE_NAME = "lunara_session";

/** Paths that require a signed-in user. */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/calendar",
  "/log",
  "/insights",
  "/wellness",
  "/fertility",
  "/pregnancy",
  "/reminders",
  "/profile",
  "/settings",
  "/privacy",
  "/search",
  "/onboarding",
  "/admin",
];

/** Screens that a signed-in user has no reason to see. */
const GUEST_ONLY_PREFIXES = ["/login", "/register"];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (!hasSessionCookie && matchesPrefix(pathname, PROTECTED_PREFIXES)) {
    const loginUrl = new URL("/login", request.url);
    // Preserve the destination so the user lands where they intended.
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSessionCookie && matchesPrefix(pathname, GUEST_ONLY_PREFIXES)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  /**
   * Skip static assets and API routes. Route handlers perform their own
   * authentication and must return proper status codes rather than redirects.
   */
  matcher: [
    "/((?!api|_next/static|_next/image|icons|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml).*)",
  ],
};
