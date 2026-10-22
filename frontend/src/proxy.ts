import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');

  // If user has active session and visits login/register, redirect to home
  if (token && isAuthRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If user does not have active session and visits protected routes, redirect to login
  if (!token && !isAuthRoute && pathname !== '/api/health') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
