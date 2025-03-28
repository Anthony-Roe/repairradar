import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import supabase from "@/lib/supabase";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublicPath = path.startsWith("/auth");

  if (isPublicPath) {
    return NextResponse.next();
  }

  const token = request.cookies.get("sb-access-token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  const response = NextResponse.next();
  response.headers.set("X-User-TenantId", data.user.user_metadata?.tenantId || "");

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*", "/admin/:path*"],
};
