import fs from 'fs';
import path from 'path';
import { NormalizedEvent } from './events';

const SNAPSHOT_FILE = path.join(process.cwd(), '.snapshots.json');

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

export function getSnapshot(): SnapshotData {
  if (!fs.existsSync(SNAPSHOT_FILE)) return EMPTY;
  try {
    return JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8'));
  } catch {
    return EMPTY;
  }
}

export function saveSnapshot(events: NormalizedEvent[]) {
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
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(data, null, 2));
}