import { readStore, writeStore } from './storage';

export type CalendarConfig = { accountEmail: string; calendarId: string; displayName: string; color: string; enabled: boolean; };

// Custody coloring: all-day events on one calendar whose titles match a rule are
// hidden from event lists and instead tint the whole day in the rule's color.
export type CustodyRule = { match: string; label: string; color: string };
export type CustodyConfig = { calendarKey: string; rules: CustodyRule[] };

export type AppConfig = {
  calendars: CalendarConfig[];
  custody?: CustodyConfig;
  // Events whose title contains any of these phrases (case-insensitive) are
  // dropped everywhere in the app — calendar views, queue, everything.
  excludedTitles?: string[];
};

const DEFAULT_CONFIG: AppConfig = { calendars: [] };

export async function getConfig(): Promise<AppConfig> {
  return readStore('config', DEFAULT_CONFIG);
}

export async function saveConfig(config: AppConfig) {
  await writeStore('config', config);
}

export async function upsertCalendarConfig(cal: CalendarConfig) {
  const config = await getConfig();
  const filtered = config.calendars.filter((c) => !(c.accountEmail === cal.accountEmail && c.calendarId === cal.calendarId));
  filtered.push(cal);
  await saveConfig({ ...config, calendars: filtered });
}

export async function removeCalendarConfig(accountEmail: string, calendarId: string) {
  const config = await getConfig();
  const filtered = config.calendars.filter((c) => !(c.accountEmail === accountEmail && c.calendarId === calendarId));
  await saveConfig({ ...config, calendars: filtered });
}

export async function getEnabledCalendars(): Promise<CalendarConfig[]> {
  return (await getConfig()).calendars.filter((c) => c.enabled);
}

export async function getExcludedTitles(): Promise<string[]> {
  return (await getConfig()).excludedTitles ?? [];
}

export async function saveExcludedTitles(phrases: string[]) {
  const config = await getConfig();
  await saveConfig({ ...config, excludedTitles: phrases });
}

export async function getCustodyConfig(): Promise<CustodyConfig | null> {
  return (await getConfig()).custody ?? null;
}

export async function saveCustodyConfig(custody: CustodyConfig | null) {
  const config = await getConfig();
  await saveConfig({ ...config, custody: custody ?? undefined });
}
