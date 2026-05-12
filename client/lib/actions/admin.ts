'use server';

import { revalidatePath } from 'next/cache';
import { api } from './config';
import { authHeaders } from './client';

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

export async function createAdminUserAction(data: any) {
  try {
    const headers = await authHeaders();
    const response = await api.post('/admin/users', data, { headers });
    revalidatePath('/admin/users');
    return { success: true, data: response.data };
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Không thể tạo tài khoản' };
  }
}

export async function deleteAdminUserAction(userId: string) {
  try {
    const headers = await authHeaders();
    const response = await api.delete(`/admin/users/${userId}`, { headers });
    revalidatePath('/admin/users');
    revalidatePath('/admin/dashboard');
    return { success: true, ...response.data };
  } catch (error: any) {
    const errorMsg = error.response?.data?.message || error.message || 'Không thể xóa user';
    console.error('deleteAdminUserAction ERROR:', errorMsg);
    return { error: Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg };
  }
}

export async function getAdminPlacesAction(page = 1, limit = 10, search?: string, category?: string) {
  try {
    const headers = await authHeaders();
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    if (category) params.set('category', category);

    const response = await api.get(`/admin/places?${params}`, { headers });
    return response.data;
  } catch (error: any) {
    return { places: [], total: 0, page: 1, lastPage: 1 };
  }
}

export async function createAdminPlaceAction(data: any) {
  try {
    const headers = await authHeaders();
    const response = await api.post('/admin/places', data, { headers });
    revalidatePath('/admin/places');
    revalidatePath('/discovery'); 
    return { success: true, data: response.data };
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Không thể tạo địa điểm' };
  }
}

export async function updateAdminPlaceAction(id: string, data: any) {
  try {
    const headers = await authHeaders();
    const response = await api.patch(`/admin/places/${id}`, data, { headers });
    revalidatePath('/admin/places');
    revalidatePath('/discovery');
    return { success: true, data: response.data };
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Không thể cập nhật địa điểm' };
  }
}

export async function deleteAdminPlaceAction(id: string) {
  try {
    const headers = await authHeaders();
    const response = await api.delete(`/admin/places/${id}`, { headers });
    revalidatePath('/admin/places');
    revalidatePath('/discovery');
    return { success: true, data: response.data };
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Không thể xóa địa điểm' };
  }
}
