import { NextRequest, NextResponse } from 'next/server';
import { upsertCalendarConfig, removeCalendarConfig } from '@/lib/config';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { accountEmail, calendarId, displayName, color, enabled } = body;

  if (enabled) {
    await upsertCalendarConfig({
      accountEmail,
      calendarId,
      displayName: displayName || 'Untitled',
      color: color || '#3b82f6',
      enabled: true,
    });
  } else {
    await removeCalendarConfig(accountEmail, calendarId);
  }

  return NextResponse.json({ success: true });
}
