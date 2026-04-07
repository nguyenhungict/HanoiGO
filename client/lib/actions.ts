'use server';

import axios from 'axios';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_ACTIONS_URL || 'http://localhost:8888',
  withCredentials: true,
});

/**
 * Xử lý đăng ký người dùng mới
 */
export async function registerAction(formData: any) {
  try {
    const response = await api.post('/auth/register', formData);
    const { accessToken, user } = response.data;

    if (accessToken) {
      // 1. Lưu token vào cookie an toàn
      const cookieStore = await cookies();
      cookieStore.set('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7 ngày
        path: '/',
      });

      // 2. Có thể lưu thêm thông tin user định danh (chỉ role/id/username) nếu cần
      cookieStore.set('user_role', user.role, { path: '/' });
      cookieStore.set('username', user.username, { path: '/' });
    }

    // return { success: true, user: response.data.user };
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Đăng ký thất bại' };
  }

  // 3. Chuyển hướng về trang khám phá
  redirect('/discovery');
}

/**
 * Xử lý đăng nhập
 */
export async function loginAction(credentials: any) {
  try {
    const response = await api.post('/auth/login', credentials);
    const { accessToken, user } = response.data;

    if (accessToken) {
      const cookieStore = await cookies();
      cookieStore.set('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });

      cookieStore.set('user_role', user.role, { path: '/' });
      cookieStore.set('username', user.username, { path: '/' });
    }
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Đăng nhập thất bại' };
  }

  redirect('/discovery');
}

/**
 * Xử lý đăng xuất
 */
export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('accessToken');
  cookieStore.delete('user_role');
  cookieStore.delete('username');
  redirect('/');
}

/**
 * Yêu cầu gửi email khôi phục mật khẩu
 */
export async function forgotPasswordAction(formData: any) {
  try {
    const response = await api.post('/auth/forgot-password', formData);
    return { success: true, message: response.data.message };
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu' };
  }
}

/**
 * Đặt lại mật khẩu mới với token
 */
export async function resetPasswordAction(formData: any) {
  try {
    const response = await api.post('/auth/reset-password', formData);
    return { success: true, message: response.data.message };
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Không thể đặt lại mật khẩu' };
  }
}
