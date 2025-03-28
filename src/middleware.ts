// File: E:\Dev\websites\repairradar\src\middleware.ts
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files, auth routes, and favicon
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/auth/signin" ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Get the session token using next-auth/jwt
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  // If token exists, user is authenticated; proceed
  if (token) {
    return NextResponse.next();
  }

  // No token: handle API routes vs. page routes
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Redirect to sign-in for protected pages
  const signInUrl = new URL("/auth/signin", request.url);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};