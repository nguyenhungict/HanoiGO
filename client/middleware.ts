import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 1. Lấy token từ cookies
  const token = request.cookies.get('accessToken')?.value;

  // 2. Lấy đường dẫn hiện tại
  const { pathname } = request.nextUrl;

  // 3. Định nghĩa các nhóm trang
  const authRoutes = ['/login', '/register'];
  const protectedRoutes = ['/discovery', '/trips', '/activities', '/places'];

  // TRƯỜNG HỢP 1: Chưa đăng nhập (Không có token)
  // Nếu đang cố vào các trang bảo vệ (protected) -> Đẩy về /login
  if (!token && protectedRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // TRƯỜNG HỢP 2: Đã đăng nhập (Có token rồi)
  // Nếu cố vào các trang auth (như /login) -> Đẩy thẳng vào /discovery
  if (token && authRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/discovery', request.url));
  }

  // Cho phép đi tiếp nếu không vi phạm các luật trên
  return NextResponse.next();
}

// Chỉ chạy middleware cho các trang này để tối ưu hiệu năng
export const config = {
  matcher: [
    '/discovery/:path*',
    '/trips/:path*',
    '/activities/:path*',
    '/places/:path*',
    '/login',
    '/register'
  ],
};

export const discovery = {

}