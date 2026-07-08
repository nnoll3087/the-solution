import { readStore, writeStore } from './storage';
import { EventChange } from './diff';

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

export async function getQueue(): Promise<QueueData> {
  return readStore('queue', EMPTY_QUEUE);
}

export async function saveQueue(data: QueueData) {
  await writeStore('queue', data);
}

export async function addChangesToQueue(changes: EventChange[]) {
  const queue = await getQueue();
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

  await saveQueue(updated);
  return newEntries.length;
}

export async function dismissEntry(entryId: string) {
  const queue = await getQueue();
  const updated: QueueData = {
    entries: queue.entries.map((e) =>
      e.id === entryId ? { ...e, dismissedAt: new Date().toISOString() } : e
    ),
  };
  await saveQueue(updated);
}

export async function dismissAllForCalendar(accountEmail: string, calendarId: string) {
  const queue = await getQueue();
  const now = new Date().toISOString();
  const updated: QueueData = {
    entries: queue.entries.map((e) =>
      e.accountEmail === accountEmail && e.calendarId === calendarId && !e.dismissedAt
        ? { ...e, dismissedAt: now }
        : e
    ),
  };
  await saveQueue(updated);
}

export async function pruneExpired() {
  const prefs = await getPreferences();
  const queue = await getQueue();
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
    await saveQueue({ entries: kept });
  }
}

// -------- Preferences --------

export async function getPreferences(): Promise<PreferencesData> {
  const parsed = await readStore<Partial<PreferencesData>>('queue-prefs', {});
  return { ...DEFAULT_PREFS, ...parsed };
}

export async function savePreferences(prefs: PreferencesData) {
  await writeStore('queue-prefs', prefs);
}

export async function setPersonPreference(pref: PersonPreferences) {
  const prefs = await getPreferences();
  const filtered = prefs.perPerson.filter((p) => p.calendarKey !== pref.calendarKey);
  filtered.push(pref);
  await savePreferences({ ...prefs, perPerson: filtered });
}
