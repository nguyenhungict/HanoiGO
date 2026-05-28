import axios from 'axios';

export const BACKEND_URL = process.env.NEXT_PUBLIC_ACTIONS_URL || 'http://localhost:8888';

export const api = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true,
});

export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 ngày
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export function resolveImageUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  return `${BACKEND_URL}${cleanUrl}`;
}

