import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Decode JWT payload without verification (safe for routing decisions only).
 * Backend always verifies the full signature on every API call.
 */
function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('accessToken')?.value;
  const { pathname } = request.nextUrl;

  // Route groups
  const authRoutes = ['/login', '/register'];
  const protectedRoutes = ['/discovery', '/trips', '/activities', '/places', '/profile'];

  // Decode role directly from JWT payload (no separate cookie needed)
  const role = token ? decodeJwtPayload(token)?.role : null;

  // CASE 1: Not logged in → redirect to login
  if (!token && protectedRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // CASE 2: Logged in but visiting auth pages → redirect based on role
  if (token && authRoutes.some(route => pathname.startsWith(route))) {
    const target = role === 'ADMIN' ? '/admin/dashboard' : '/discovery';
    return NextResponse.redirect(new URL(target, request.url));
  }

  // CASE 3: Protect admin routes
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!token || role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/discovery', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/discovery/:path*',
    '/trips/:path*',
    '/activities/:path*',
    '/places/:path*',
    '/profile/:path*',
    '/admin/:path*',
    '/login',
    '/register'
  ],
};