// middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import {middleware as handler} from '@/lib/middleware'

export async function middleware(request: NextRequest) {
  return await handler(request)
}

export const config = {
  matcher: [
    // Match all paths except:
    // - /api (API routes)
    // - /_next/static (static files)
    // - /_next/image (image optimization)
    // - /favicon.ico
    '/((?!api|auth|_next/static|_next/image|favicon.ico).*)',
  ],
};