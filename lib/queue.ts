import fs from 'fs';
import path from 'path';
import { EventChange } from './diff';

const QUEUE_FILE = path.join(process.cwd(), '.queue.json');
const PREFS_FILE = path.join(process.cwd(), '.queue-prefs.json');

export type QueueEntry = EventChange & {
  id: string;
  dismissedAt?: string;
};

export type QueueData = {
  entries: QueueEntry[];
};

export type ClearMode = 'never' | 'hours' | 'days';

export type PersonPreferences = {
  calendarKey: string;
  clearMode: ClearMode;
  clearAfterHours: number;
};

export type PreferencesData = {
  perPerson: PersonPreferences[];
  defaultClearMode: ClearMode;
  defaultClearAfterHours: number;
};

const EMPTY_QUEUE: QueueData = { entries: [] };
const DEFAULT_PREFS: PreferencesData = {
  perPerson: [],
  defaultClearMode: 'days',
  defaultClearAfterHours: 168,
};

function calendarKey(entry: { accountEmail: string; calendarId: string }) {
  return entry.accountEmail + '::' + entry.calendarId;
}

// -------- Queue --------

export function getQueue(): QueueData {
  if (!fs.existsSync(QUEUE_FILE)) return EMPTY_QUEUE;
  try {
    return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
  } catch {
    return EMPTY_QUEUE;
  }
}

export function saveQueue(data: QueueData) {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(data, null, 2));
}

export function addChangesToQueue(changes: EventChange[]) {
  const queue = getQueue();
  const existingKeys = new Set(
    queue.entries.map((e) => e.type + ':' + e.eventId + ':' + (e.changedFields || []).join(','))
  );

  const newEntries: QueueEntry[] = changes
    .filter((c) => {
      const key = c.type + ':' + c.eventId + ':' + (c.changedFields || []).join(',');
      return !existingKeys.has(key);
    })
    .map((c) => ({
      ...c,
      id: c.type + '-' + c.eventId + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    }));

  const updated: QueueData = {
    entries: [...queue.entries, ...newEntries],
  };

  saveQueue(updated);
  return newEntries.length;
}

export function dismissEntry(entryId: string) {
  const queue = getQueue();
  const updated: QueueData = {
    entries: queue.entries.map((e) =>
      e.id === entryId ? { ...e, dismissedAt: new Date().toISOString() } : e
    ),
  };
  saveQueue(updated);
}

export function dismissAllForCalendar(accountEmail: string, calendarId: string) {
  const queue = getQueue();
  const now = new Date().toISOString();
  const updated: QueueData = {
    entries: queue.entries.map((e) =>
      e.accountEmail === accountEmail && e.calendarId === calendarId && !e.dismissedAt
        ? { ...e, dismissedAt: now }
        : e
    ),
  };
  saveQueue(updated);
}

export function pruneExpired() {
  const prefs = getPreferences();
  const queue = getQueue();
  const now = Date.now();

  const kept = queue.entries.filter((entry) => {
    const perPerson = prefs.perPerson.find((p) => p.calendarKey === calendarKey(entry));
    const clearMode = perPerson?.clearMode ?? prefs.defaultClearMode;
    const clearHours = perPerson?.clearAfterHours ?? prefs.defaultClearAfterHours;

    if (clearMode === 'never') return true;
    if (!entry.dismissedAt) return true;

    const dismissedTime = new Date(entry.dismissedAt).getTime();
    const cutoff = dismissedTime + clearHours * 60 * 60 * 1000;
    return now < cutoff;
  });

  if (kept.length !== queue.entries.length) {
    saveQueue({ entries: kept });
  }
}

// -------- Preferences --------

export function getPreferences(): PreferencesData {
  if (!fs.existsSync(PREFS_FILE)) return DEFAULT_PREFS;
  try {
    const parsed = JSON.parse(fs.readFileSync(PREFS_FILE, 'utf8'));
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePreferences(prefs: PreferencesData) {
  fs.writeFileSync(PREFS_FILE, JSON.stringify(prefs, null, 2));
}

export function setPersonPreference(pref: PersonPreferences) {
  const prefs = getPreferences();
  const filtered = prefs.perPerson.filter((p) => p.calendarKey !== pref.calendarKey);
  filtered.push(pref);
  savePreferences({ ...prefs, perPerson: filtered });
}