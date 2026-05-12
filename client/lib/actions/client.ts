'use server';

import { cookies } from 'next/headers';

export async function getToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('accessToken')?.value || null;
}

export async function authHeaders() {
  const token = await getToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
