import { NextResponse } from 'next/server';

const ACTIONS_URL = process.env.NEXT_PUBLIC_ACTIONS_URL || 'http://localhost:8888';

export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const accessToken = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('accessToken='))
    ?.split('=')[1];

  if (!accessToken) {
    const response = NextResponse.json({ authenticated: false }, { status: 401 });
    response.cookies.delete('accessToken');
    response.cookies.delete('username');
    response.cookies.delete('user_role');
    return response;
  }

  try {
    const backendResponse = await fetch(`${ACTIONS_URL}/users/profile`, {
      headers: {
        Authorization: `Bearer ${decodeURIComponent(accessToken)}`,
      },
      cache: 'no-store',
    });

    if (!backendResponse.ok) {
      const response = NextResponse.json({ authenticated: false }, { status: 401 });
      response.cookies.delete('accessToken');
      response.cookies.delete('username');
      response.cookies.delete('user_role');
      return response;
    }

    return NextResponse.json({ authenticated: true });
  } catch {
    return NextResponse.json(
      { authenticated: false, message: 'Unable to verify session' },
      { status: 503 },
    );
  }
}
