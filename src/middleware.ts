export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  console.log("[Middleware] Requested path:", pathname);
 
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/auth/signin" ||
    pathname === "/favicon.ico"
  ) {
    console.log("[Middleware] Bypassing for:", pathname);
    return NextResponse.next();
  }

  const authCookie = req.cookies.get("next-auth.session-token");
  console.log("[Middleware] Auth cookie:", authCookie ? "exists" : "not found");

  if (!authCookie) {
    if (pathname.startsWith("/api/")) {
      console.log("[Middleware] No auth cookie for API, returning unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    } else {
      console.log("[Middleware] No auth cookie found, redirecting to /auth/signin");
      return NextResponse.redirect(new URL("/auth/signin", req.url));
    }
  }

  console.log("[Middleware] User authenticated, proceeding to:", pathname);
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
