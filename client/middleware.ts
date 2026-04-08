import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 1. Lấy token từ cookies
  const token = request.cookies.get('accessToken')?.value;

  // 2. Lấy đường dẫn hiện tại
  const { pathname } = request.nextUrl;

  // 3. Định nghĩa các nhóm trang
  const authRoutes = ['/login', '/register'];
  const protectedRoutes = ['/discovery', '/trips', '/activities', '/places', '/profile'];
  const adminRoutes = ['/admin'];

  // Lấy role từ cookies
  const role = request.cookies.get('user_role')?.value;

  // TRƯỜNG HỢP 1: Chưa đăng nhập
  if (!token && protectedRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // TRƯỜNG HỢP 2: Đã đăng nhập nhưng vào trang Auth
  if (token && authRoutes.some(route => pathname.startsWith(route))) {
    const target = role === 'ADMIN' ? '/admin/dashboard' : '/discovery';
    return NextResponse.redirect(new URL(target, request.url));
  }

  // TRƯỜNG HỢP 3: Bảo vệ trang Admin (Trừ trang login của admin)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!token || role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/discovery', request.url));
    }
  }

  return NextResponse.next();
}

// Chỉ chạy middleware cho các trang này để tối ưu hiệu năng
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

export const discovery = {

}