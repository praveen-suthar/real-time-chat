import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isPublicRoute = isAuthRoute || pathname === '/404' || pathname === '/_not-found';

  // If user has active session and visits login/register, redirect to home
  if (token && isAuthRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (!token && !isPublicRoute && pathname !== '/api/health') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
