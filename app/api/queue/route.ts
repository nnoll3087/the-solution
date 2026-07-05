import { NextRequest, NextResponse } from 'next/server';
import { fetchAllEvents } from '@/lib/events';
import { detectChanges } from '@/lib/diff';
import { saveSnapshot } from '@/lib/snapshots';
import {
  addChangesToQueue,
  getQueue,
  dismissEntry,
  dismissAllForCalendar,
  pruneExpired,
} from '@/lib/queue';

const LOOKAHEAD_DAYS = 90;

export async function GET() {
  const now = new Date();
  const timeMin = now;
  const timeMax = new Date(now.getTime() + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);

  const events = await fetchAllEvents(timeMin, timeMax);
  const changes = detectChanges(events);
  const added = addChangesToQueue(changes);
  saveSnapshot(events);
  pruneExpired();

  const queue = getQueue();
  return NextResponse.json({
    entries: queue.entries,
    detectedChanges: added,
    lastRun: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, entryId, accountEmail, calendarId } = body;

  if (action === 'dismiss' && entryId) {
    dismissEntry(entryId);
    return NextResponse.json({ success: true });
  }

  if (action === 'dismiss_all_for_calendar' && accountEmail && calendarId) {
    dismissAllForCalendar(accountEmail, calendarId);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}