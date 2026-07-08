import { NextRequest, NextResponse } from 'next/server';
import { expectedAuthToken, AUTH_COOKIE } from '@/lib/auth';

export async function proxy(request: NextRequest) {
  const expected = await expectedAuthToken();
  if (!expected) return NextResponse.next(); // FAMILY_PASSWORD not set: auth off

  const cookie = request.cookies.get(AUTH_COOKIE)?.value;
  if (cookie === expected) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = {
  // Everything except the login page/API, Next internals, and static assets
  matcher: ['/((?!login|api/auth/login|_next/static|_next/image|favicon\\.ico|.*\\.svg).*)'],
};
