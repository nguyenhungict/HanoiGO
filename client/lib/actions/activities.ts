'use server';

import { revalidatePath } from 'next/cache';
import { api } from './config';
import { authHeaders } from './client';

export async function getActivitiesAction(lat?: number, lng?: number, radius?: number) {
  try {
    const params = new URLSearchParams();
    if (lat) params.append('lat', String(lat));
    if (lng) params.append('lng', String(lng));
    if (radius) params.append('radius', String(radius));

    const headers = await authHeaders();
    const response = await api.get(`/activities?${params.toString()}`, { headers });
    return { success: true, data: response.data };
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Không thể lấy danh sách hoạt động' };
  }
}

export async function getActivityDetailsAction(id: string) {
  try {
    const headers = await authHeaders();
    const response = await api.get(`/activities/${id}`, { headers });
    return { success: true, data: response.data };
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Không thể lấy thông tin chi tiết' };
  }
}

export async function createActivityAction(data: any) {
  try {
    const headers = await authHeaders();
    if (!headers.Authorization) return { error: 'Chưa đăng nhập' };

    const response = await api.post('/activities', data, { headers });
    revalidatePath('/activities');
    return { success: true, data: response.data };
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Tạo hoạt động thất bại' };
  }
}

export async function requestToJoinAction(id: string) {
  try {
    const headers = await authHeaders();
    if (!headers.Authorization) return { error: 'Chưa đăng nhập' };

    const response = await api.post(`/activities/${id}/join`, {}, { headers });
    return { success: true, data: response.data };
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Gửi yêu cầu thất bại' };
  }
}

export async function approveMemberAction(activityId: string, userId: string) {
  try {
    const headers = await authHeaders();
    if (!headers.Authorization) return { error: 'Chưa đăng nhập' };

    const response = await api.patch(`/activities/${activityId}/approve/${userId}`, {}, { headers });
    revalidatePath(`/activities/${activityId}`);
    return { success: true, data: response.data };
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Duyệt thành viên thất bại' };
  }
}

export async function getActivityMembersAction(id: string) {
  try {
    const headers = await authHeaders();
    if (!headers.Authorization) return { error: 'Chưa đăng nhập' };

    const response = await api.get(`/activities/${id}/members`, { headers });
    return { success: true, data: response.data };
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Không thể lấy danh sách thành viên' };
  }
}

export async function rejectMemberAction(activityId: string, userId: string) {
  try {
    const headers = await authHeaders();
    if (!headers.Authorization) return { error: 'Chưa đăng nhập' };

    const response = await api.patch(`/activities/${activityId}/reject/${userId}`, {}, { headers });
    revalidatePath(`/activities/${activityId}`);
    return { success: true, data: response.data };
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Từ chối thành viên thất bại' };
  }
}

export async function getMyActivitiesAction() {
  try {
    const headers = await authHeaders();
    if (!headers.Authorization) return { error: 'Chưa đăng nhập' };

    const response = await api.get('/activities/my', { headers });
    return { success: true, data: response.data };
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Không thể lấy hoạt động của tôi' };
  }
}

export async function deleteActivityAction(id: string) {
  try {
    const headers = await authHeaders();
    if (!headers.Authorization) return { error: 'Chưa đăng nhập' };

    await api.delete(`/activities/${id}`, { headers });
    revalidatePath('/activities');
    return { success: true };
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Xóa hoạt động thất bại' };
  }
}

export async function cancelJoinRequestAction(id: string) {
  try {
    const headers = await authHeaders();
    if (!headers.Authorization) return { error: 'Chưa đăng nhập' };

    await api.delete(`/activities/${id}/join`, { headers });
    revalidatePath('/activities');
    return { success: true };
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Hủy yêu cầu thất bại' };
  }
}
