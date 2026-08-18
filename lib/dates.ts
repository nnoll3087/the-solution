// Client-safe date helpers for event rendering.
//
// All-day events come from Google as bare 'YYYY-MM-DD' strings with an
// EXCLUSIVE end date. Parsing those with new Date() lands on UTC midnight,
// which is the previous evening in US timezones and makes next-day events
// bleed into the prior day's cell. Always go through these helpers.

export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Inverse of parseLocalDate: local calendar date -> 'YYYY-MM-DD', not UTC-shifted
// like toISOString() would give.
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

// Sunday of the week containing `date`, matching Calendar.tsx's week-view convention.
export function startOfWeek(date: Date): Date {
  const s = new Date(date);
  s.setDate(date.getDate() - date.getDay());
  s.setHours(0, 0, 0, 0);
  return s;
}

type EventLike = { start: string; end: string; allDay: boolean };

export function eventStartMs(e: EventLike): number {
  if (e.allDay) return parseLocalDate(e.start).getTime();
  return new Date(e.start).getTime();
}

// For all-day events this returns the last millisecond of the final day
// (converting Google's exclusive end into an inclusive one).
export function eventEndMs(e: EventLike): number {
  if (e.allDay) return parseLocalDate(e.end).getTime() - 1;
  return new Date(e.end).getTime();
}

export function eventOnDay(e: EventLike, dayStartMs: number, dayEndMs: number): boolean {
  return eventStartMs(e) <= dayEndMs && eventEndMs(e) >= dayStartMs;
}
