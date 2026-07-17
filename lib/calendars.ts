import { google } from 'googleapis';
import { getToken, getAllTokens } from './tokens';
import { getAuthClient } from './google';

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

export async function listCalendarsForAccount(accountEmail: string): Promise<CalendarInfo[]> {
  const token = await getToken(accountEmail);
  if (!token) return [];

  const calendar = google.calendar({ version: 'v3', auth: getAuthClient(token) });

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
