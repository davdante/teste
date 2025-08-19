import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for auth routes and static files
  if (pathname.startsWith('/(auth)') || 
      pathname.startsWith('/api') || 
      pathname.startsWith('/_next') ||
      pathname.includes('.')) {
    return NextResponse.next();
  }

  // Check for session cookie
  const session = request.cookies.get('session');
  
  // If no session and trying to access app routes, redirect to login
  if (!session && pathname.startsWith('/(app)')) {
    return NextResponse.redirect(new URL('/(auth)/login', request.url));
  }

  // If has session and on login page, redirect to dashboard
  if (session && pathname === '/(auth)/login') {
    return NextResponse.redirect(new URL('/(app)/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api|.*\..*).*)'],
};