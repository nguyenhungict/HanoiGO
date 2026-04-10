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

// ── Helper: Lấy token từ cookie ────────────────────────────────────
async function getToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('accessToken')?.value || null;
}

// ── Helper: Tạo header Authorization ────────────────────────────────
async function authHeaders() {
  const token = await getToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

// ============================================================
// AUTH ACTIONS
// ============================================================

/**
 * Xử lý đăng ký người dùng mới
 */
export async function registerAction(formData: any) {
  try {
    const response = await api.post('/auth/register', formData);
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

      // Lưu username để hiển thị (không nhạy cảm)
      cookieStore.set('username', user.username, { 
        path: '/', 
        maxAge: COOKIE_MAX_AGE,
        secure: IS_PRODUCTION,
        sameSite: 'strict'
      });
    }
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Đăng ký thất bại' };
  }

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

      cookieStore.set('username', user.username, { 
        path: '/', 
        maxAge: COOKIE_MAX_AGE,
        secure: IS_PRODUCTION,
        sameSite: 'strict'
      });

      return { success: true, user };
    }

    return { success: true };
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Đăng nhập thất bại' };
  }
}

/**
 * Xử lý đăng xuất
 */
export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('accessToken');
  cookieStore.delete('username');
  cookieStore.delete('user_role'); // Dọn sạch cookie cũ (legacy)
  redirect('/');
}

// ============================================================
// PASSWORD ACTIONS
// ============================================================

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

// ============================================================
// USER PROFILE ACTIONS
// ============================================================

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

// ============================================================
// ADMIN ACTIONS
// ============================================================

export async function getAdminStatsAction() {
  try {
    const headers = await authHeaders();
    const response = await api.get('/admin/stats', { headers });
    return response.data;
  } catch (error: any) {
    return null;
  }
}

export async function getAdminGrowthAction() {
  try {
    const headers = await authHeaders();
    const response = await api.get('/admin/stats/growth', { headers });
    return response.data;
  } catch (error: any) {
    return [];
  }
}

export async function getAdminPopularPlacesAction() {
  try {
    const headers = await authHeaders();
    const response = await api.get('/admin/stats/popular-places', { headers });
    return response.data;
  } catch (error: any) {
    return [];
  }
}

export async function getAdminViolationsAction() {
  try {
    const headers = await authHeaders();
    const response = await api.get('/admin/stats/violations', { headers });
    return response.data;
  } catch (error: any) {
    return [];
  }
}

export async function getAdminReportSummaryAction() {
  try {
    const headers = await authHeaders();
    const response = await api.get('/admin/stats/reports', { headers });
    return response.data;
  } catch (error: any) {
    return null;
  }
}

export async function getAdminUsersAction(page = 1, limit = 10, search?: string, status?: string) {
  try {
    const headers = await authHeaders();
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    if (status) params.set('status', status);

    const response = await api.get(`/admin/users?${params}`, { headers });
    return response.data;
  } catch (error: any) {
    return { users: [], total: 0, page: 1, lastPage: 1 };
  }
}

import { revalidatePath } from 'next/cache';

export async function banUserAction(userId: string, reason: string, description?: string) {
  try {
    const headers = await authHeaders();
    const response = await api.patch(`/admin/users/${userId}/ban`, { reason, description }, { headers });
    revalidatePath('/admin/users');
    revalidatePath('/admin/dashboard');
    return { success: true, ...response.data };
  } catch (error: any) {
    const errorMsg = error.response?.data?.message || error.message || 'Không thể ban user';
    console.error('banUserAction ERROR:', errorMsg);
    return { error: Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg };
  }
}

export async function unbanUserAction(userId: string) {
  try {
    const headers = await authHeaders();
    const response = await api.patch(`/admin/users/${userId}/unban`, {}, { headers });
    revalidatePath('/admin/users');
    revalidatePath('/admin/dashboard');
    return { success: true, ...response.data };
  } catch (error: any) {
    const errorMsg = error.response?.data?.message || error.message || 'Không thể unban user';
    console.error('unbanUserAction ERROR:', errorMsg);
    return { error: Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg };
  }
}

export async function getAdminUserDetailsAction(userId: string) {
  try {
    const headers = await authHeaders();
    const response = await api.get(`/admin/users/${userId}`, { headers });
    return response.data;
  } catch (error: any) {
    return null;
  }
}
