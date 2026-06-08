import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_ACTIONS_URL || 'http://localhost:8888';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') || '1';
  const limit = searchParams.get('limit') || '10';
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';

  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value || '';

  const params = new URLSearchParams({ page, limit });
  if (search) params.set('search', search);
  if (category) params.set('category', category);

  try {
    const res = await fetch(`${BACKEND_URL}/admin/places?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });
    
    if (!res.ok) {
      return NextResponse.json({ places: [], total: 0, page: 1, lastPage: 1 }, { status: res.status });
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API proxy error:', error);
    return NextResponse.json({ places: [], total: 0, page: 1, lastPage: 1 }, { status: 500 });
  }
}
