import { NextRequest, NextResponse } from 'next/server';
import { fetchAllEvents } from '@/lib/events';
import { detectChanges } from '@/lib/diff';
import { saveSnapshot } from '@/lib/snapshots';
import {
  addChangesToQueue,
  getQueue,
  dismissEntry,
  dismissAllForCalendar,
  clearQueue,
  pruneExpired,
} from '@/lib/queue';
import { getAllTags, resolveTags, seriesId } from '@/lib/tags';
import { getEnabledCalendars } from '@/lib/config';

const LOOKAHEAD_DAYS = 90;

export async function GET() {
  const now = new Date();
  const timeMin = now;
  const timeMax = new Date(now.getTime() + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);

  const { events, authErrors, fetchFailed } = await fetchAllEvents(timeMin, timeMax);
  // ANY failed calendar fetch (broken connection, rate limit, Google hiccup)
  // makes that calendar's events vanish from this fetch; diffing against that
  // floods the queue with false "deleted" entries, then false "new" entries when
  // it recovers. Only run change detection on a fully successful fetch.
  let added = 0;
  if (!fetchFailed) {
    const changes = await detectChanges(events);
    added = await addChangesToQueue(changes);
    await saveSnapshot(events);
  }
  await pruneExpired();

  const queue = await getQueue();

  // Resolve Solution-only tags at read time so late tagging still reaches everyone's queue
  const tagsMap = await getAllTags();
  const byKey = new Map((await getEnabledCalendars()).map((c) => [c.accountEmail + '::' + c.calendarId, c]));
  const entries = queue.entries.map((e) => {
    const alsoFor = resolveTags(tagsMap[seriesId(e.eventId)], e.accountEmail + '::' + e.calendarId, byKey)
      .map((c) => c.displayName);
    return alsoFor.length > 0 ? { ...e, alsoFor } : e;
  });

  return NextResponse.json({
    entries,
    detectedChanges: added,
    authErrors,
    lastRun: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, entryId, accountEmail, calendarId } = body;

  if (action === 'dismiss' && entryId) {
    await dismissEntry(entryId);
    return NextResponse.json({ success: true });
  }

  if (action === 'dismiss_all_for_calendar' && accountEmail && calendarId) {
    await dismissAllForCalendar(accountEmail, calendarId);
    return NextResponse.json({ success: true });
  }

  if (action === 'clear_all') {
    await clearQueue();
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}