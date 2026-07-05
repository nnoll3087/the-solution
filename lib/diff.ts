import { NormalizedEvent } from './events';
import { EventSnapshot, getSnapshot } from './snapshots';

export type ChangeType = 'new' | 'changed' | 'deleted';

export type EventChange = {
  type: ChangeType;
  eventId: string;
  calendarId: string;
  accountEmail: string;
  displayName: string;
  title: string;
  start: string;
  end: string;
  detectedAt: string;
  changedFields?: string[];
  previous?: {
    title?: string;
    start?: string;
    end?: string;
    location?: string;
  };
};

function isFutureEvent(startISO: string): boolean {
  return new Date(startISO).getTime() >= Date.now();
}

function eventsEqual(a: EventSnapshot | NormalizedEvent, b: EventSnapshot | NormalizedEvent): string[] {
  const differences: string[] = [];
  if (a.title !== b.title) differences.push('title');
  if (a.start !== b.start) differences.push('start');
  if (a.end !== b.end) differences.push('end');
  if ((a.location || '') !== (b.location || '')) differences.push('location');
  if ((a.description || '') !== (b.description || '')) differences.push('description');
  return differences;
}

export function detectChanges(currentEvents: NormalizedEvent[]): EventChange[] {
  const snapshot = getSnapshot();

  // First run — no snapshot yet, no changes
  if (snapshot.lastRun === null) {
    return [];
  }

  const previousById = new Map<string, EventSnapshot>();
  snapshot.events.forEach((e) => previousById.set(e.id, e));

  const currentById = new Map<string, NormalizedEvent>();
  currentEvents.forEach((e) => currentById.set(e.id, e));

  const changes: EventChange[] = [];
  const detectedAt = new Date().toISOString();

  // New events — in current but not in snapshot
  currentEvents.forEach((event) => {
    if (!isFutureEvent(event.start)) return;
    if (!previousById.has(event.id)) {
      changes.push({
        type: 'new',
        eventId: event.id,
        calendarId: event.calendarId,
        accountEmail: event.accountEmail,
        displayName: event.displayName,
        title: event.title,
        start: event.start,
        end: event.end,
        detectedAt,
      });
    }
  });

  // Changed events — in both, but different
  currentEvents.forEach((event) => {
    if (!isFutureEvent(event.start)) return;
    const prev = previousById.get(event.id);
    if (!prev) return;
    const diffs = eventsEqual(prev, event);
    if (diffs.length > 0) {
      changes.push({
        type: 'changed',
        eventId: event.id,
        calendarId: event.calendarId,
        accountEmail: event.accountEmail,
        displayName: event.displayName,
        title: event.title,
        start: event.start,
        end: event.end,
        detectedAt,
        changedFields: diffs,
        previous: {
          title: prev.title,
          start: prev.start,
          end: prev.end,
          location: prev.location,
        },
      });
    }
  });

  // Deleted events — in snapshot but not in current
  snapshot.events.forEach((prev) => {
    if (!isFutureEvent(prev.start)) return;
    if (!currentById.has(prev.id)) {
      changes.push({
        type: 'deleted',
        eventId: prev.id,
        calendarId: prev.calendarId,
        accountEmail: prev.accountEmail,
        displayName: prev.displayName,
        title: prev.title,
        start: prev.start,
        end: prev.end,
        detectedAt,
      });
    }
  });

  return changes;
}