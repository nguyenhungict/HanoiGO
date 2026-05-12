import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_ACTIONS_URL || 'http://localhost:8888',
  withCredentials: true,
});

export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 ngày
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
