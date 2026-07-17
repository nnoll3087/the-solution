import { google } from 'googleapis';
import { getToken, saveToken, StoredToken } from './tokens';

// Single place to build an authenticated Google client. Persists refreshed access
// tokens back to the store so we don't pay a refresh round-trip on every request.

export function getAuthClient(token: StoredToken) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({
    access_token: token.accessToken,
    refresh_token: token.refreshToken,
    expiry_date: token.expiresAt,
  });
  oauth2Client.on('tokens', (fresh) => {
    if (!fresh.access_token) return;
    saveToken({
      accountEmail: token.accountEmail,
      accessToken: fresh.access_token,
      refreshToken: fresh.refresh_token || token.refreshToken,
      expiresAt: fresh.expiry_date || Date.now() + 55 * 60 * 1000,
    }).catch((err) => console.error('Failed to persist refreshed token for ' + token.accountEmail + ':', err));
  });
  return oauth2Client;
}

export async function getCalendarForAccount(accountEmail: string) {
  const token = await getToken(accountEmail);
  if (!token) return null;
  return google.calendar({ version: 'v3', auth: getAuthClient(token) });
}

// True when the Google account needs to be reconnected (revoked/expired refresh
// token or rejected credentials), as opposed to a transient API failure.
export function isAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as {
    message?: string;
    status?: number;
    code?: number | string;
    response?: { status?: number; data?: { error?: string } };
  };
  const status = e.response?.status ?? (typeof e.code === 'number' ? e.code : e.status);
  if (status === 401) return true;
  if (e.response?.data?.error === 'invalid_grant') return true;
  return typeof e.message === 'string' && e.message.includes('invalid_grant');
}
