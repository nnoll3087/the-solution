'use client';

import { useEffect, useState } from 'react';

type ChangeType = 'new' | 'changed' | 'deleted';

type QueueEntry = {
  id: string;
  type: ChangeType;
  eventId: string;
  calendarId: string;
  accountEmail: string;
  displayName: string;
  title: string;
  start: string;
  end: string;
  detectedAt: string;
  dismissedAt?: string;
  changedFields?: string[];
  previous?: { title?: string; start?: string; end?: string; location?: string };
};

type ClearMode = 'never' | 'hours' | 'days';

type Preferences = {
  perPerson: {
    calendarKey: string;
    clearMode: ClearMode;
    clearAfterHours: number;
  }[];
  defaultClearMode: ClearMode;
  defaultClearAfterHours: number;
};

export function QueueView() {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [activePerson, setActivePerson] = useState<string>('all');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    load();
    loadPrefs();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  function load() {
    fetch('/api/queue').then((r) => r.json()).then((data) => setEntries(data.entries || []));
  }

  function loadPrefs() {
    fetch('/api/queue/preferences').then((r) => r.json()).then(setPrefs);
  }

  async function dismiss(entryId: string) {
    await fetch('/api/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'dismiss', entryId }),
    });
    load();
  }

  async function dismissAllForPerson(person: string) {
    const items = entries.filter((e) => e.displayName === person && !e.dismissedAt);
    for (const item of items) {
      await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss', entryId: item.id }),
      });
    }
    load();
  }

  const active = entries.filter((e) => !e.dismissedAt);
  const byPerson: Record<string, QueueEntry[]> = {};
  active.forEach((e) => {
    if (!byPerson[e.displayName]) byPerson[e.displayName] = [];
    byPerson[e.displayName].push(e);
  });
  const people = Object.keys(byPerson).sort();
  const filtered = activePerson === 'all' ? active : (byPerson[activePerson] || []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActivePerson('all')}
            className={'px-3 py-1.5 rounded-lg text-sm ' + (activePerson === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300')}
          >
            All ({active.length})
          </button>
          {people.map((p) => (
            <button
              key={p}
              onClick={() => setActivePerson(p)}
              className={'px-3 py-1.5 rounded-lg text-sm ' + (activePerson === p ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300')}
            >
              {p} ({byPerson[p].length})
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm"
        >
          {showSettings ? 'Close settings' : 'Settings'}
        </button>
      </div>

      {showSettings && prefs && (
        <QueueSettings prefs={prefs} people={people} entries={active} onSaved={loadPrefs} />
      )}

      {activePerson !== 'all' && byPerson[activePerson] && byPerson[activePerson].length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => dismissAllForPerson(activePerson)}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            Dismiss all for {activePerson}
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-8 text-center">
          <p className="text-slate-400">All caught up.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((entry) => (
            <li key={entry.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={'text-xs uppercase tracking-wide font-semibold ' + typeColor(entry.type)}>
                      {entry.type}
                    </span>
                    <span className="text-xs text-slate-500">for {entry.displayName}</span>
                  </div>
                  <div className="text-slate-100 font-medium">{entry.title}</div>
                  <div className="text-sm text-slate-400 mt-1">{formatWhen(entry)}</div>
                  {entry.type === 'changed' && entry.previous && entry.changedFields && (
                    <ChangedDetails entry={entry} />
                  )}
                </div>
                <button
                  onClick={() => dismiss(entry.id)}
                  className="text-xs text-slate-500 hover:text-slate-200 flex-shrink-0"
                >
                  Dismiss
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function typeColor(t: ChangeType): string {
  if (t === 'new') return 'text-emerald-400';
  if (t === 'changed') return 'text-amber-400';
  return 'text-rose-400';
}

function formatWhen(entry: QueueEntry): string {
  const s = new Date(entry.start);
  return s.toLocaleString('default', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function ChangedDetails({ entry }: { entry: QueueEntry }) {
  if (!entry.changedFields || !entry.previous) return null;
  return (
    <div className="mt-2 text-xs text-slate-500 space-y-0.5">
      {entry.changedFields.map((field) => {
        const prev = (entry.previous as Record<string, string | undefined>)[field];
        const curr = (entry as unknown as Record<string, string | undefined>)[field];
        if (!prev || !curr) return null;
        return (
          <div key={field}>
            {field}: <span className="line-through">{prev}</span> → {curr}
          </div>
        );
      })}
    </div>
  );
}

function QueueSettings({
  prefs,
  people,
  entries,
  onSaved,
}: {
  prefs: Preferences;
  people: string[];
  entries: QueueEntry[];
  onSaved: () => void;
}) {
  const [defaultMode, setDefaultMode] = useState<ClearMode>(prefs.defaultClearMode);
  const [defaultHours, setDefaultHours] = useState<number>(prefs.defaultClearAfterHours);

  async function saveDefaults(mode: ClearMode, hours: number) {
    await fetch('/api/queue/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'set_defaults',
        defaultClearMode: mode,
        defaultClearAfterHours: hours,
      }),
    });
    onSaved();
  }

  async function savePerson(person: string, mode: ClearMode, hours: number) {
    const sample = entries.find((e) => e.displayName === person);
    if (!sample) return;
    const calendarKey = sample.accountEmail + '::' + sample.calendarId;
    await fetch('/api/queue/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'set_person',
        calendarKey,
        clearMode: mode,
        clearAfterHours: hours,
      }),
    });
    onSaved();
  }

  function getPersonPref(person: string) {
    const sample = entries.find((e) => e.displayName === person);
    if (!sample) return null;
    const calendarKey = sample.accountEmail + '::' + sample.calendarId;
    return prefs.perPerson.find((p) => p.calendarKey === calendarKey);
  }

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 space-y-4">
      <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">Auto-clear settings</h3>

      <div>
        <div className="text-sm text-slate-400 mb-2">Default (applies to everyone unless overridden)</div>
        <div className="flex items-center gap-2">
          <select
            value={defaultMode}
            onChange={(e) => { const m = e.target.value as ClearMode; setDefaultMode(m); saveDefaults(m, defaultHours); }}
            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-sm text-slate-200"
          >
            <option value="never">Never auto-clear</option>
            <option value="hours">After hours</option>
            <option value="days">After days</option>
          </select>
          {defaultMode !== 'never' && (
            <>
              <input
                type="number"
                min={1}
                value={defaultMode === 'days' ? Math.round(defaultHours / 24) : defaultHours}
                onChange={(e) => {
                  const v = parseInt(e.target.value) || 1;
                  const hours = defaultMode === 'days' ? v * 24 : v;
                  setDefaultHours(hours);
                  saveDefaults(defaultMode, hours);
                }}
                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-sm text-slate-200 w-16"
              />
              <span className="text-sm text-slate-400">{defaultMode}</span>
            </>
          )}
        </div>
      </div>

      {people.length > 0 && (
        <div>
          <div className="text-sm text-slate-400 mb-2">Per person overrides</div>
          <div className="space-y-2">
            {people.map((person) => {
const pref = getPersonPref(person);
const mode: ClearMode = pref?.clearMode ?? defaultMode;
const hours = pref?.clearAfterHours ?? defaultHours;
              return (
                <div key={person} className="flex items-center gap-2 text-sm">
                  <span className="text-slate-200 w-24">{person}</span>
                  <select
                    value={mode}
                    onChange={(e) => {
                      const m = e.target.value as ClearMode;
                      savePerson(person, m, hours);
                    }}
                    className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-sm text-slate-200"
                  >
                    <option value="never">Never</option>
                    <option value="hours">After hours</option>
                    <option value="days">After days</option>
                  </select>
                  {mode !== 'never' && (
                    <>
                      <input
                        type="number"
                        min={1}
                        value={mode === 'days' ? Math.round(hours / 24) : hours}
                        onChange={(e) => {
                          const v = parseInt(e.target.value) || 1;
                          const newHours = mode === 'days' ? v * 24 : v;
                          savePerson(person, mode, newHours);
                        }}
                        className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-sm text-slate-200 w-16"
                      />
                      <span className="text-slate-400">{mode}</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}