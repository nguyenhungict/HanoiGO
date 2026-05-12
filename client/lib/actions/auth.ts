'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeJwtPayload } from '../auth-utils';
import { api, COOKIE_MAX_AGE, IS_PRODUCTION } from './config';
import { getToken } from './client';

export async function registerAction(formData: any) {
  try {
    await api.post('/auth/register', formData);
    return { success: true, email: formData.email };
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Đăng ký thất bại' };
  }
}

export async function verifyOtpAction(email: string, otp: string) {
  try {
    const response = await api.post('/auth/verify-otp', { email, otp });
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

      cookieStore.set('username', user.username, { 
        path: '/', 
        maxAge: COOKIE_MAX_AGE,
        secure: IS_PRODUCTION,
        sameSite: 'strict'
      });

      return { success: true, user };
    }
    return { error: 'Xác thực thất bại' };
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Xác thực thất bại' };
  }
}

export async function resendOtpAction(email: string) {
  try {
    const response = await api.post('/auth/resend-otp', { email });
    return { success: true, message: response.data.message };
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Gửi lại mã thất bại' };
  }
}

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

      cookieStore.set('username', user.username, { 
        path: '/', 
        maxAge: COOKIE_MAX_AGE,
        secure: IS_PRODUCTION,
        sameSite: 'strict'
      });

      return { success: true, user, token: accessToken };
    }

    return { success: true };
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Đăng nhập thất bại' };
  }
}

export async function getSessionAction() {
  const token = await getToken();
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  return { token, user: { id: payload?.sub, username: payload?.username } };
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('accessToken');
  cookieStore.delete('username');
  cookieStore.delete('user_role');
  redirect('/');
}
