import fs from 'fs';
import path from 'path';

const CONFIG_FILE = path.join(process.cwd(), '.config.json');

export type CalendarConfig = { accountEmail: string; calendarId: string; displayName: string; color: string; enabled: boolean; };

export type AppConfig = { calendars: CalendarConfig[]; };

const DEFAULT_CONFIG: AppConfig = { calendars: [] };

export function getConfig(): AppConfig {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch { return DEFAULT_CONFIG; }
}

export function saveConfig(config: AppConfig) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export function upsertCalendarConfig(cal: CalendarConfig) {
  const config = getConfig();
  const filtered = config.calendars.filter((c) => !(c.accountEmail === cal.accountEmail && c.calendarId === cal.calendarId));
  filtered.push(cal);
  saveConfig({ ...config, calendars: filtered });
}

export function removeCalendarConfig(accountEmail: string, calendarId: string) {
  const config = getConfig();
  const filtered = config.calendars.filter((c) => !(c.accountEmail === accountEmail && c.calendarId === calendarId));
  saveConfig({ ...config, calendars: filtered });
}

export function getEnabledCalendars(): CalendarConfig[] {
  return getConfig().calendars.filter((c) => c.enabled);
}
