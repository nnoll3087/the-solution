import { NextRequest, NextResponse } from 'next/server';
import { getCalendarForAccount, isAuthError } from '@/lib/google';

type Reminder = {
  method: 'email' | 'popup';
  minutes: number;
};

type EventCreatePayload = {
  accountEmail: string;
  calendarId: string;
  title: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  allDay: boolean;
  timezone?: string;
  attendees?: string[];
  recurrence?: string;
  reminders?: Reminder[];
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as EventCreatePayload;

  const {
    accountEmail,
    calendarId,
    title,
    description,
    location,
    start,
    end,
    allDay,
    timezone,
    attendees,
    recurrence,
    reminders,
  } = body;

  if (!accountEmail || !calendarId || !title || !start || !end) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const calendar = await getCalendarForAccount(accountEmail);
  if (!calendar) {
    return NextResponse.json({ error: 'No token for account' }, { status: 401 });
  }

  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const requestBody: Record<string, unknown> = {
    summary: title,
  };

  if (description) requestBody.description = description;
  if (location) requestBody.location = location;

  if (allDay) {
    requestBody.start = { date: start.slice(0, 10) };
    requestBody.end = { date: end.slice(0, 10) };
  } else {
    requestBody.start = { dateTime: start, timeZone: tz };
    requestBody.end = { dateTime: end, timeZone: tz };
  }

  if (attendees && attendees.length > 0) {
    requestBody.attendees = attendees
      .map((email) => email.trim())
      .filter((email) => email.length > 0)
      .map((email) => ({ email }));
  }

  if (recurrence && recurrence !== 'none') {
    requestBody.recurrence = [recurrence];
  }

  if (reminders && reminders.length > 0) {
    requestBody.reminders = {
      useDefault: false,
      overrides: reminders.map((r) => ({ method: r.method, minutes: r.minutes })),
    };
  } else {
    requestBody.reminders = { useDefault: true };
  }

  try {
    const res = await calendar.events.insert({
      calendarId,
      requestBody,
      sendUpdates: attendees && attendees.length > 0 ? 'all' : 'none',
    });

    return NextResponse.json({
      success: true,
      event: {
        id: res.data.id,
        htmlLink: res.data.htmlLink,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to create event:', message);
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: 'Google connection for ' + accountEmail + ' has expired. Reconnect it on the Setup page.' },
        { status: 401 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}