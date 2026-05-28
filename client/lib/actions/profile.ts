'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { api, COOKIE_MAX_AGE, IS_PRODUCTION } from './config';
import { authHeaders } from './client';

export async function forgotPasswordAction(formData: any) {
  try {
    const response = await api.post('/auth/forgot-password', formData);
    return { success: true, message: response.data.message };
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu' };
  }
}

export async function resetPasswordAction(formData: any) {
  try {
    const response = await api.post('/auth/reset-password', formData);
    return { success: true, message: response.data.message };
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Không thể đặt lại mật khẩu' };
  }
}

export async function getProfileAction() {
  try {
    const headers = await authHeaders();
    if (!headers.Authorization) return { error: 'Chưa đăng nhập' };

    const response = await api.get('/users/profile', { headers });
    return { success: true, data: response.data };
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Không thể lấy thông tin hồ sơ' };
  }
}

export async function updateProfileAction(data: any) {
  try {
    const headers = await authHeaders();
    if (!headers.Authorization) redirect('/login');

    const response = await api.patch('/users/profile', data, { headers });

    if (data.username) {
      const cookieStore = await cookies();
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
