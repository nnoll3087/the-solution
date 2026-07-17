import { NextRequest, NextResponse } from 'next/server';
import { getCalendarForAccount, isAuthError } from '@/lib/google';

type Reminder = {
  method: 'email' | 'popup';
  minutes: number;
};

type EventUpdatePayload = {
  accountEmail: string;
  calendarId: string;
  eventId: string;
  title?: string;
  description?: string;
  location?: string;
  start?: string;
  end?: string;
  allDay?: boolean;
  timezone?: string;
  attendees?: string[];
  recurrence?: string;
  reminders?: Reminder[];
};

type EventDeletePayload = {
  accountEmail: string;
  calendarId: string;
  eventId: string;
};

function authExpiredResponse(accountEmail: string) {
  return NextResponse.json(
    { error: 'Google connection for ' + accountEmail + ' has expired. Reconnect it on the Setup page.' },
    { status: 401 }
  );
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json()) as EventUpdatePayload;
  const { accountEmail, calendarId, eventId } = body;

  if (!accountEmail || !calendarId || !eventId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const calendar = await getCalendarForAccount(accountEmail);
  if (!calendar) {
    return NextResponse.json({ error: 'No token for account' }, { status: 401 });
  }

  const tz = body.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const requestBody: Record<string, unknown> = {};

  if (body.title !== undefined) requestBody.summary = body.title;
  if (body.description !== undefined) requestBody.description = body.description || null;
  if (body.location !== undefined) requestBody.location = body.location || null;

  if (body.start && body.end) {
    if (body.allDay) {
      requestBody.start = { date: body.start.slice(0, 10) };
      requestBody.end = { date: body.end.slice(0, 10) };
    } else {
      requestBody.start = { dateTime: body.start, timeZone: tz };
      requestBody.end = { dateTime: body.end, timeZone: tz };
    }
  }

  if (body.attendees !== undefined) {
    requestBody.attendees = body.attendees
      .map((email) => email.trim())
      .filter((email) => email.length > 0)
      .map((email) => ({ email }));
  }

  if (body.recurrence !== undefined) {
    if (body.recurrence === 'none') {
      requestBody.recurrence = null;
    } else {
      requestBody.recurrence = [body.recurrence];
    }
  }

  if (body.reminders !== undefined) {
    if (body.reminders.length > 0) {
      requestBody.reminders = {
        useDefault: false,
        overrides: body.reminders.map((r) => ({ method: r.method, minutes: r.minutes })),
      };
    } else {
      requestBody.reminders = { useDefault: true };
    }
  }

  try {
    const res = await calendar.events.patch({
      calendarId,
      eventId,
      requestBody,
      sendUpdates: body.attendees && body.attendees.length > 0 ? 'all' : 'none',
    });
    return NextResponse.json({
      success: true,
      event: { id: res.data.id, htmlLink: res.data.htmlLink },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to update event:', message);
    if (isAuthError(error)) return authExpiredResponse(accountEmail);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const body = (await request.json()) as EventDeletePayload;
  const { accountEmail, calendarId, eventId } = body;

  if (!accountEmail || !calendarId || !eventId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const calendar = await getCalendarForAccount(accountEmail);
  if (!calendar) {
    return NextResponse.json({ error: 'No token for account' }, { status: 401 });
  }

  try {
    await calendar.events.delete({ calendarId, eventId, sendUpdates: 'all' });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to delete event:', message);
    if (isAuthError(error)) return authExpiredResponse(accountEmail);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}