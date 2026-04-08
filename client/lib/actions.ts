'use server';

import axios from 'axios';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_ACTIONS_URL || 'http://localhost:8888',
  withCredentials: true,
});

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 ngày
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

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
        secure: IS_PRODUCTION,
        sameSite: 'strict',
        maxAge: COOKIE_MAX_AGE,
        path: '/',
      });

      // 2. Có thể lưu thêm thông tin user định danh (chỉ role/id/username) nếu cần
      cookieStore.set('user_role', user.role, { 
        path: '/', 
        maxAge: COOKIE_MAX_AGE,
        secure: IS_PRODUCTION,
        sameSite: 'strict'
      });
      cookieStore.set('username', user.username, { 
        path: '/', 
        maxAge: COOKIE_MAX_AGE,
        secure: IS_PRODUCTION,
        sameSite: 'strict'
      });
    }

    // return { success: true, user: response.data.user };
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Đăng ký thất bại' };
  }

  // 3. Chuyển hướng về trang hoàn thiện hồ sơ cho người dùng mới
  redirect('/profile/edit');
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
        secure: IS_PRODUCTION,
        sameSite: 'strict',
        maxAge: COOKIE_MAX_AGE,
        path: '/',
      });

      cookieStore.set('user_role', user.role, { 
        path: '/', 
        maxAge: COOKIE_MAX_AGE,
        secure: IS_PRODUCTION,
        sameSite: 'strict'
      });
      cookieStore.set('username', user.username, { 
        path: '/', 
        maxAge: COOKIE_MAX_AGE,
        secure: IS_PRODUCTION,
        sameSite: 'strict'
      });
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

/**
 * Lấy thông tin hồ sơ của người dùng hiện tại
 */
export async function getProfileAction() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;

    if (!token) return { error: 'Chưa đăng nhập' };

    const response = await api.get('/users/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });

    return { success: true, data: response.data };
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Không thể lấy thông tin hồ sơ' };
  }
}

/**
 * Cập nhật thông tin hồ sơ
 */
export async function updateProfileAction(data: any) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;

    if (!token) redirect('/login');

    const response = await api.patch('/users/profile', data, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // Cập nhật lại cookie username nếu user có đổi tên định danh
    if (data.username) {
      cookieStore.set('username', data.username, { 
        path: '/', 
        maxAge: COOKIE_MAX_AGE,
        secure: IS_PRODUCTION,
        sameSite: 'strict'
      });
    }

    return { success: true, data: response.data };
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Cập nhật hồ sơ thất bại' };
  }
}
