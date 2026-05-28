'use server';

import { api } from './config';
import { authHeaders } from './client';

export async function uploadImageAction(formData: FormData) {
  try {
    const headers = await authHeaders();
    const response = await api.post('/media/upload', formData, { 
      headers: { 
        ...headers,
        'Content-Type': 'multipart/form-data' 
      } 
    });
    return { success: true, url: response.data.url };
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Tải ảnh thất bại' };
  }
}
