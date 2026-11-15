import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

const PROTECTED_PAGES = [
  "/dashboard",
  "/signals",
  "/charts",
  "/strategy",
  "/notifications",
  "/settings",
];

const PROTECTED_API_PREFIXES = [
  "/api/market",
  "/api/indicators",
  "/api/signals",
  "/api/strategies",
  "/api/kite",
  "/api/notifications",
];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // 1. Allow static files, Next.js internal files, favicon, manifest
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // 2. Read session cookie
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionCookie ? await verifySessionToken(sessionCookie) : null;

  // 3. Handle login page redirect if already authenticated
  if (pathname === "/login") {
    if (session) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // 4. Protect private API routes
  const isProtectedApi = PROTECTED_API_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  if (isProtectedApi) {
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // 5. Protect dashboard pages
  const isProtectedPage = PROTECTED_PAGES.some((page) =>
    pathname.startsWith(page)
  );
  if (isProtectedPage) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/signals/:path*",
    "/charts/:path*",
    "/strategy/:path*",
    "/notifications/:path*",
    "/settings/:path*",
    "/login",
    "/api/market/:path*",
    "/api/indicators/:path*",
    "/api/signals/:path*",
    "/api/strategies/:path*",
    "/api/kite/:path*",
    "/api/notifications/:path*",
  ],
};
