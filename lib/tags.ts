import { readStore, writeStore } from './storage';

// Solution-only "also for" tags. Never written to Google Calendar.
// Maps eventId -> list of calendarKeys ('email::calendarId'), or the special FAMILY_TAG.

export const FAMILY_TAG = 'family';

export type EventTagsMap = Record<string, string[]>;

// Google expands recurring events into instances with IDs like 'abc123_20260701T220000Z'.
// Tags apply to the whole series, so strip the instance suffix before any read or write.
export function seriesId(eventId: string): string {
  return eventId.replace(/_\d{8}(T\d{6}Z)?$/, '');
}

export async function getAllTags(): Promise<EventTagsMap> {
  return readStore('event-tags', {});
}

export async function setEventTags(eventId: string, tags: string[]) {
  const all = await getAllTags();
  const key = seriesId(eventId);
  if (tags.length === 0) delete all[key];
  else all[key] = tags;
  await writeStore('event-tags', all);
}

// Expand a tag list into displayable people, excluding the event's home calendar.
// FAMILY_TAG expands to every enabled calendar except home.
export function resolveTags<T extends { displayName: string; color: string }>(
  tags: string[] | undefined,
  homeKey: string,
  byKey: Map<string, T>
): T[] {
  if (!tags || tags.length === 0) return [];
  const keys = tags.includes(FAMILY_TAG) ? [...byKey.keys()] : tags;
  const out: T[] = [];
  for (const k of new Set(keys)) {
    if (k === homeKey || k === FAMILY_TAG) continue;
    const cal = byKey.get(k);
    if (cal) out.push(cal);
  }
  return out;
}
