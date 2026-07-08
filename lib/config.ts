import { readStore, writeStore } from './storage';

export type CalendarConfig = { accountEmail: string; calendarId: string; displayName: string; color: string; enabled: boolean; };

export type AppConfig = { calendars: CalendarConfig[]; };

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
