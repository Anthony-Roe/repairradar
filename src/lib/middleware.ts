// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from './prisma';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const tenant = pathname.split('/')[1];
  const session = request.cookies.get('next-auth.session-token');

  // Validate tenant
  if (!session) {
    return NextResponse.redirect(new URL('/api/auth/signin', request.url));
  }

  // Get the authentication token
  const secret = process.env.NEXTAUTH_SECRET;
  const token = await getToken({ 
    req: request,
    secret,
    // If you're using a different cookie name or encryption
    // cookieName: 'next-auth.session-token',
    // secureCookie: process.env.NODE_ENV === 'production'
  });

  // If no valid token, redirect to login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Add tenant context to headers
  const headers = new Headers(request.headers);
  headers.set('x-tenant-id', tenant);

  return NextResponse.next({
    request: {
      headers
    }
  });
}