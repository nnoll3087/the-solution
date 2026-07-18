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

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#84cc16', // lime
  '#06b6d4', // cyan
  '#a855f7', // purple
  '#eab308', // yellow
];

const AUTO_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899'];

export function CalendarSelector({
  calendars,
  savedConfigs,
}: {
  calendars: Calendar[];
  savedConfigs: SavedConfig[];
}) {
  const [saving, setSaving] = useState<string | null>(null);
  const [openPicker, setOpenPicker] = useState<string | null>(null);

  function getConfig(cal: Calendar) {
    return savedConfigs.find(
      (c) => c.accountEmail === cal.accountEmail && c.calendarId === cal.calendarId
    );
  }

  function suggestColor(cal: Calendar): string {
    const enabledCount = savedConfigs.filter((c) => c.enabled).length;
    return AUTO_COLORS[enabledCount % AUTO_COLORS.length] || PRESET_COLORS[0];
  }

  async function save(cal: Calendar, patch: { enabled?: boolean; displayName?: string; color?: string }) {
    const key = cal.accountEmail + ':' + cal.calendarId;
    setSaving(key);
    const existing = getConfig(cal);
    const enabled = patch.enabled !== undefined ? patch.enabled : !!existing;
    await fetch('/api/calendars/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountEmail: cal.accountEmail,
        calendarId: cal.calendarId,
        displayName: patch.displayName ?? existing?.displayName ?? cal.summary,
        color: patch.color ?? existing?.color ?? suggestColor(cal),
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
          <h3 className="text-sm font-medium text-text-muted mb-2 uppercase tracking-wide">
            {email}
          </h3>
          <ul className="space-y-2">
            {cals.map((cal) => {
              const config = getConfig(cal);
              const enabled = !!config;
              const key = cal.accountEmail + ':' + cal.calendarId;
              const currentColor = config?.color || cal.backgroundColor || '#666';
              const pickerOpen = openPicker === key;
              return (
                <li key={cal.calendarId} className="bg-bg/25 rounded-md border border-border-themed">
                  <div className="flex items-center gap-3 text-sm px-3 py-2">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => save(cal, { enabled: e.target.checked })}
                      disabled={saving === key}
                      className="w-4 h-4 accent-[var(--theme-accent)]"
                    />
                    <button
                      onClick={() => enabled && setOpenPicker(pickerOpen ? null : key)}
                      disabled={!enabled}
                      className="w-4 h-4 rounded-full flex-shrink-0 ring-offset-2 ring-offset-[var(--theme-background)] disabled:cursor-default enabled:hover:ring-2 enabled:hover:ring-text-subtle transition"
                      style={{ backgroundColor: currentColor }}
                      title={enabled ? 'Change color' : ''}
                    />
                    {enabled ? (
                      <input
                        type="text"
                        defaultValue={config?.displayName}
                        onBlur={(e) => save(cal, { displayName: e.target.value })}
                        className="bg-bg/40 text-text border border-border-themed rounded-md px-2 py-1.5 text-sm flex-1 min-w-0"
                      />
                    ) : (
                      <span className="text-text-muted flex-1 truncate">{cal.summary}</span>
                    )}
                    {cal.primary && (
                      <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded">
                        primary
                      </span>
                    )}
                  </div>
                  {pickerOpen && enabled && (
                    <div className="border-t border-border-themed p-3 space-y-2">
                      <div className="grid grid-cols-6 gap-2">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c}
                            onClick={() => save(cal, { color: c })}
                            className={'w-8 h-8 rounded-full transition ' + (currentColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[var(--theme-background)]' : 'hover:scale-110')}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t border-border-themed">
                        <label className="text-xs text-text-muted">Custom:</label>
                        <input
                          type="color"
                          value={currentColor}
                          onChange={(e) => save(cal, { color: e.target.value })}
                          className="w-8 h-8 bg-bg rounded cursor-pointer border border-border-themed"
                        />
                        <span className="text-xs text-text-subtle font-mono">{currentColor}</span>
                      </div>
                    </div>
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