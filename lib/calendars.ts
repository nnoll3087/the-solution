import { google } from 'googleapis';
import { getToken, getAllTokens } from './tokens';

export type CalendarInfo = {
  accountEmail: string;
  calendarId: string;
  summary: string;
  description?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  primary?: boolean;
  accessRole?: string;
};

function getAuthClient(accessToken: string, refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return oauth2Client;
}

export async function listCalendarsForAccount(accountEmail: string): Promise<CalendarInfo[]> {
  const token = await getToken(accountEmail);
  if (!token) return [];

  const auth = getAuthClient(token.accessToken, token.refreshToken);
  const calendar = google.calendar({ version: 'v3', auth });

  try {
    const res = await calendar.calendarList.list({ maxResults: 250 });
    const items = res.data.items || [];

    return items.map((item) => ({
      accountEmail,
      calendarId: item.id || '',
      summary: item.summary || 'Untitled',
      description: item.description || undefined,
      backgroundColor: item.backgroundColor || undefined,
      foregroundColor: item.foregroundColor || undefined,
      primary: item.primary || false,
      accessRole: item.accessRole || undefined,
    }));
  } catch (error) {
    console.error(`Failed to list calendars for ${accountEmail}:`, error);
    return [];
  }
}

export async function listAllCalendars(): Promise<CalendarInfo[]> {
  const tokens = await getAllTokens();
  const results = await Promise.all(
    tokens.map((t) => listCalendarsForAccount(t.accountEmail))
  );
  return results.flat();
}
