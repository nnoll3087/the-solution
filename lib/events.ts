import { google } from 'googleapis';
import { getToken } from './tokens';
import { getAuthClient, isAuthError } from './google';
import { getEnabledCalendars, CalendarConfig } from './config';
import { getAllTags, resolveTags, seriesId } from './tags';

export type TaggedPerson = { displayName: string; color: string };

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
  organizerSelf?: boolean; // true when this calendar is the event's organizer
  tags?: string[];        // raw Solution-only tags (calendarKeys or 'family')
  alsoFor?: TaggedPerson[]; // tags resolved to people, home calendar excluded
};

// Accounts whose Google connection is broken (revoked/expired token). The UI uses
// this to show a "reconnect" state instead of silently rendering an empty calendar.
export type EventsResult = {
  events: NormalizedEvent[];
  authErrors: string[]; // account emails needing reconnection
  fetchFailed: boolean; // true when ANY calendar fetch errored (auth or transient)
};

type CalendarFetch = { events: NormalizedEvent[]; authError?: string; fetchError?: boolean };

async function fetchEventsForCalendar(cal: CalendarConfig, timeMin: string, timeMax: string): Promise<CalendarFetch> {
  const token = await getToken(cal.accountEmail);
  if (!token) return { events: [], authError: cal.accountEmail, fetchError: true };
  const calendar = google.calendar({ version: 'v3', auth: getAuthClient(token) });
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
    const events = items.map((item) => {
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
        organizerSelf: item.organizer?.self === true,
      };
    });
    return { events };
  } catch (error) {
    console.error('Failed to fetch events for ' + cal.displayName + ':', error);
    if (isAuthError(error)) return { events: [], authError: cal.accountEmail, fetchError: true };
    return { events: [], fetchError: true };
  }
}

export async function fetchAllEvents(timeMin: Date, timeMax: Date): Promise<EventsResult> {
  const enabled = await getEnabledCalendars();
  const results = await Promise.all(
    enabled.map((cal) => fetchEventsForCalendar(cal, timeMin.toISOString(), timeMax.toISOString()))
  );
  const authErrors = [...new Set(results.map((r) => r.authError).filter((e): e is string => !!e))];
  const fetchFailed = results.some((r) => r.fetchError);
  const flat = results.flatMap((r) => r.events);

  // An event a family member was invited to appears on both calendars with the
  // same ID. Keep the organizer's copy so it shows under the right person.
  const byId = new Map<string, NormalizedEvent>();
  for (const event of flat) {
    const existing = byId.get(event.id);
    if (!existing || (event.organizerSelf && !existing.organizerSelf)) {
      byId.set(event.id, event);
    }
  }
  const deduped = [...byId.values()];

  const tagsMap = await getAllTags();
  const byKey = new Map(enabled.map((c) => [c.accountEmail + '::' + c.calendarId, c]));
  for (const event of deduped) {
    const tags = tagsMap[seriesId(event.id)];
    if (!tags || tags.length === 0) continue;
    event.tags = tags;
    event.alsoFor = resolveTags(tags, event.accountEmail + '::' + event.calendarId, byKey).map(
      (c) => ({ displayName: c.displayName, color: c.color })
    );
  }

  return { events: deduped, authErrors, fetchFailed };
}
