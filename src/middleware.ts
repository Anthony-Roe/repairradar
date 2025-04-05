// middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import {middleware as handler} from '@/lib/middleware'

export async function middleware(request: NextRequest) {
  return await handler(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
