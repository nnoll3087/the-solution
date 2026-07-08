import { NextRequest, NextResponse } from 'next/server';
import { expectedAuthToken, authEnabled, AUTH_COOKIE, AUTH_MAX_AGE } from '@/lib/auth';

export async function POST(request: NextRequest) {
  if (!authEnabled()) {
    return NextResponse.json({ error: 'Auth is not configured' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const { password } = body;

  if (typeof password !== 'string' || password !== process.env.FAMILY_PASSWORD) {
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  }

  const token = await expectedAuthToken();
  const res = NextResponse.json({ success: true });
  res.cookies.set(AUTH_COOKIE, token!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: AUTH_MAX_AGE,
    path: '/',
  });
  return res;
}
