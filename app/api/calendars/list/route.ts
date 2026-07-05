import { NextResponse } from 'next/server';
import { getEnabledCalendars } from '@/lib/config';

export async function GET() {
  const calendars = getEnabledCalendars().map((c) => ({
    accountEmail: c.accountEmail,
    calendarId: c.calendarId,
    displayName: c.displayName,
    color: c.color,
  }));
  return NextResponse.json({ calendars });
}