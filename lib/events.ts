import { google } from 'googleapis';
import { getToken } from './tokens';
import { getEnabledCalendars, CalendarConfig } from './config';

export type NormalizedEvent = {
  id: string;
  calendarId: string;
  accountEmail: string;
  displayName: string;
  color: string;
  title: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  allDay: boolean;
};

function getAuthClient(accessToken: string, refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  return oauth2Client;
}

async function fetchEventsForCalendar(cal: CalendarConfig, timeMin: string, timeMax: string): Promise<NormalizedEvent[]> {
  const token = getToken(cal.accountEmail);
  if (!token) return [];
  const auth = getAuthClient(token.accessToken, token.refreshToken);
  const calendar = google.calendar({ version: 'v3', auth });
  try {
    const res = await calendar.events.list({
      calendarId: cal.calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 2500,
    });
    const items = res.data.items || [];
    return items.map((item) => {
      const isAllDay = !!item.start?.date;
      return {
        id: item.id || Math.random().toString(36),
        calendarId: cal.calendarId,
        accountEmail: cal.accountEmail,
        displayName: cal.displayName,
        color: cal.color,
        title: item.summary || '(No title)',
        description: item.description || undefined,
        location: item.location || undefined,
        start: item.start?.dateTime || item.start?.date || '',
        end: item.end?.dateTime || item.end?.date || '',
        allDay: isAllDay,
      };
    });
  } catch (error) {
    console.error('Failed to fetch events for ' + cal.displayName + ':', error);
    return [];
  }
}

export async function fetchAllEvents(timeMin: Date, timeMax: Date): Promise<NormalizedEvent[]> {
  const enabled = getEnabledCalendars();
  const results = await Promise.all(
    enabled.map((cal) => fetchEventsForCalendar(cal, timeMin.toISOString(), timeMax.toISOString()))
  );
  return results.flat();
}
