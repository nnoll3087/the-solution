import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { saveToken } from '@/lib/tokens';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    if (!tokens.access_token || !tokens.refresh_token || !userInfo.email) {
      return NextResponse.json({ error: 'Missing token data' }, { status: 500 });
    }

    saveToken({
      accountEmail: userInfo.email,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expiry_date || Date.now() + 3600 * 1000,
    });

    return NextResponse.redirect(new URL('/setup?connected=' + encodeURIComponent(userInfo.email), request.url));
  } catch (error) {
    console.error('OAuth error:', error);
    return NextResponse.json({ error: 'OAuth failed' }, { status: 500 });
  }
}
