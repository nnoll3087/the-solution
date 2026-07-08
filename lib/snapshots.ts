import { readStore, writeStore } from './storage';
import { NormalizedEvent } from './events';

export type EventSnapshot = {
  id: string;
  calendarId: string;
  accountEmail: string;
  displayName: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
};

export type SnapshotData = {
  lastRun: string | null;
  events: EventSnapshot[];
};

const EMPTY: SnapshotData = { lastRun: null, events: [] };

export async function getSnapshot(): Promise<SnapshotData> {
  return readStore('snapshots', EMPTY);
}

export async function saveSnapshot(events: NormalizedEvent[]) {
  const data: SnapshotData = {
    lastRun: new Date().toISOString(),
    events: events.map((e) => ({
      id: e.id,
      calendarId: e.calendarId,
      accountEmail: e.accountEmail,
      displayName: e.displayName,
      title: e.title,
      start: e.start,
      end: e.end,
      location: e.location,
      description: e.description,
    })),
  };
  await writeStore('snapshots', data);
}
