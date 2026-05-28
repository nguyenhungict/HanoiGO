'use server';

import { api } from './config';
import { authHeaders } from './client';

export async function getNotificationsAction(cursor?: string, limit = 20) {
  try {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    params.append('limit', String(limit));

    const headers = await authHeaders();
    if (!headers.Authorization) return { error: 'Chưa đăng nhập' };

    const response = await api.get(`/notifications?${params.toString()}`, { headers });
    return { success: true, data: response.data };
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Không thể tải thông báo' };
  }
}

export async function getUnreadCountAction() {
  try {
    const headers = await authHeaders();
    if (!headers.Authorization) return { error: 'Chưa đăng nhập' };

    const response = await api.get('/notifications/unread-count', { headers });
    return { success: true, data: response.data };
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Không thể lấy số lượng thông báo chưa đọc' };
  }
}

export async function markReadAction(id: string) {
  try {
    const headers = await authHeaders();
    if (!headers.Authorization) return { error: 'Chưa đăng nhập' };

    const response = await api.patch(`/notifications/${id}/read`, {}, { headers });
    return { success: true, data: response.data };
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Lỗi khi đánh dấu đã đọc' };
  }
}

export async function markAllReadAction() {
  try {
    const headers = await authHeaders();
    if (!headers.Authorization) return { error: 'Chưa đăng nhập' };

    const response = await api.patch('/notifications/read-all', {}, { headers });
    return { success: true, data: response.data };
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Lỗi khi đánh dấu đọc tất cả' };
  }
}
