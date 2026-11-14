import { NextResponse, type NextRequest } from "next/server";

/** Must match SESSION_COOKIE in src/server/domain/auth.ts (kept literal: proxy stays dependency-free). */
const SESSION_COOKIE = "tbwc_session";

/**
 * Send visitors without a session cookie to sign-in before any protected page renders.
 *
 * This is a fast first gate only. Every API route still validates the session
 * and the user's role against the database, and the page guards redirect
 * anyone whose session turns out to be invalid or who lacks the role.
 *
 * Only active when the app runs against the real API (NEXT_PUBLIC_API_URL set);
 * the mock platform keeps its session in browser storage instead.
 */
export function proxy(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_API_URL) return NextResponse.next();
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/account/:path*",
    "/dashboard/:path*",
    "/portfolio/:path*",
    "/deposits/:path*",
    "/performance/:path*",
    "/dividends/:path*",
    "/leaderboard/:path*",
    "/profile/:path*",
  ],
};
