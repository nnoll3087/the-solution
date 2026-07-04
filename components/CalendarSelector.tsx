'use client';

import { useState } from 'react';

type Calendar = {
  accountEmail: string;
  calendarId: string;
  summary: string;
  backgroundColor?: string;
  primary?: boolean;
  accessRole?: string;
};

type SavedConfig = {
  accountEmail: string;
  calendarId: string;
  displayName: string;
  color: string;
  enabled: boolean;
};

export function CalendarSelector({
  calendars,
  savedConfigs,
}: {
  calendars: Calendar[];
  savedConfigs: SavedConfig[];
}) {
  const [saving, setSaving] = useState<string | null>(null);

  function getConfig(cal: Calendar) {
    return savedConfigs.find(
      (c) => c.accountEmail === cal.accountEmail && c.calendarId === cal.calendarId
    );
  }

  async function toggle(cal: Calendar, enabled: boolean, displayName?: string, color?: string) {
    const key = cal.accountEmail + ':' + cal.calendarId;
    setSaving(key);
    const existing = getConfig(cal);
    await fetch('/api/calendars/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountEmail: cal.accountEmail,
        calendarId: cal.calendarId,
        displayName: displayName ?? existing?.displayName ?? cal.summary,
        color: color ?? existing?.color ?? cal.backgroundColor ?? '#3b82f6',
        enabled,
      }),
    });
    setSaving(null);
    window.location.reload();
  }

  const byAccount = calendars.reduce((acc, cal) => {
    if (!acc[cal.accountEmail]) acc[cal.accountEmail] = [];
    acc[cal.accountEmail].push(cal);
    return acc;
  }, {} as Record<string, Calendar[]>);

  return (
    <div className="space-y-6">
      {Object.entries(byAccount).map(([email, cals]) => (
        <div key={email}>
          <h3 className="text-sm font-medium text-slate-400 mb-2 uppercase tracking-wide">
            {email}
          </h3>
          <ul className="space-y-2">
            {cals.map((cal) => {
              const config = getConfig(cal);
              const enabled = !!config;
              const key = cal.accountEmail + ':' + cal.calendarId;
              return (
                <li key={cal.calendarId} className="flex items-center gap-3 text-sm bg-slate-950 rounded-md px-3 py-2 border border-slate-800">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => toggle(cal, e.target.checked)}
                    disabled={saving === key}
                    className="w-4 h-4 accent-blue-500"
                  />
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: config?.color || cal.backgroundColor || '#666' }}
                  />
                  {enabled ? (
                    <input
                      type="text"
                      defaultValue={config?.displayName}
                      onBlur={(e) => toggle(cal, true, e.target.value)}
                      className="bg-slate-900 text-slate-100 border border-slate-700 rounded px-2 py-1 text-sm flex-1"
                    />
                  ) : (
                    <span className="text-slate-400 flex-1 truncate">{cal.summary}</span>
                  )}
                  {cal.primary && (
                    <span className="text-xs bg-blue-950 text-blue-300 px-2 py-0.5 rounded">
                      primary
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}