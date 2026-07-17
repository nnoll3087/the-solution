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
  alsoFor?: string[];
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
    // Deep link from QueuePreview: /queue?person=Edie
    const person = new URLSearchParams(window.location.search).get('person');
    if (person) setActivePerson(person);
    load();
    loadPrefs();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  function load() {
    fetch('/api/queue').then((r) => r.json()).then((data) => setEntries(data.entries || [])).catch(() => {});
  }

  function loadPrefs() {
    fetch('/api/queue/preferences').then((r) => r.json()).then(setPrefs).catch(() => {});
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
    const items = entries.filter(
      (e) => (e.displayName === person || (e.alsoFor || []).includes(person)) && !e.dismissedAt
    );
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
    // Tagged people see the entry in their filter too
    const names = [e.displayName, ...(e.alsoFor || [])];
    new Set(names).forEach((n) => {
      if (!byPerson[n]) byPerson[n] = [];
      byPerson[n].push(e);
    });
  });
  const people = Object.keys(byPerson).sort();
  const filtered = activePerson === 'all' ? active : (byPerson[activePerson] || []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActivePerson('all')}
            className={'px-3 py-1.5 rounded-lg text-sm ' + (activePerson === 'all' ? 'bg-accent text-white' : 'bg-surface hover:bg-surface-elevated text-text-muted')}
          >
            All ({active.length})
          </button>
          {people.map((p) => (
            <button
              key={p}
              onClick={() => setActivePerson(p)}
              className={'px-3 py-1.5 rounded-lg text-sm ' + (activePerson === p ? 'bg-accent text-white' : 'bg-surface hover:bg-surface-elevated text-text-muted')}
            >
              {p} ({byPerson[p].length})
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-elevated text-text-muted text-sm"
        >
          {showSettings ? 'Close settings' : 'Settings'}
        </button>
      </div>

      {showSettings && prefs && (
        <>
          <QueueSettings prefs={prefs} people={people} entries={active} onSaved={loadPrefs} />
          <ClearQueueButton onCleared={load} />
        </>
      )}

      {activePerson !== 'all' && byPerson[activePerson] && byPerson[activePerson].length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => dismissAllForPerson(activePerson)}
            className="text-xs text-text-muted hover:text-text"
          >
            Dismiss all for {activePerson}
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-surface/80 backdrop-blur rounded-lg border border-border-themed p-8 text-center">
          <p className="text-text-muted">All caught up.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((entry) => (
            <li key={entry.id} className="bg-surface border border-border-themed rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={'text-xs uppercase tracking-wide font-semibold ' + typeColor(entry.type)}>
                      {entry.type}
                    </span>
                    <span className="text-xs text-text-subtle">
                      for {[entry.displayName, ...(entry.alsoFor || [])].join(' + ')}
                    </span>
                  </div>
                  <div className="text-text font-medium">{entry.title}</div>
                  <div className="text-sm text-text-muted mt-1">{formatWhen(entry)}</div>
                  {entry.type === 'changed' && entry.previous && entry.changedFields && (
                    <ChangedDetails entry={entry} />
                  )}
                </div>
                <button
                  onClick={() => dismiss(entry.id)}
                  className="text-xs text-text-subtle hover:text-text flex-shrink-0"
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

function ClearQueueButton({ onCleared }: { onCleared: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);

  async function clearAll() {
    setClearing(true);
    await fetch('/api/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear_all' }),
    });
    setClearing(false);
    setConfirming(false);
    onCleared();
  }

  return (
    <div className="bg-surface rounded-lg border border-border-themed p-4 flex items-center justify-between gap-3">
      <div>
        <div className="text-sm font-semibold text-text">Clear entire queue</div>
        <p className="text-xs text-text-subtle mt-0.5">
          Removes every entry for everyone, including dismissed history. Can&apos;t be undone.
        </p>
      </div>
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="px-3 py-2 rounded-lg bg-surface-elevated hover:bg-danger-themed/30 text-text-muted hover:text-danger-themed text-sm flex-shrink-0 transition"
        >
          Clear all
        </button>
      ) : (
        <span className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setConfirming(false)} disabled={clearing} className="px-3 py-2 rounded-lg bg-surface-elevated hover:brightness-110 text-text text-sm">
            Cancel
          </button>
          <button onClick={clearAll} disabled={clearing} className="px-3 py-2 rounded-lg bg-danger-themed hover:brightness-110 text-white text-sm font-medium disabled:opacity-50">
            {clearing ? 'Clearing...' : 'Yes, clear everything'}
          </button>
        </span>
      )}
    </div>
  );
}

function typeColor(t: ChangeType): string {
  if (t === 'new') return 'text-success-themed';
  if (t === 'changed') return 'text-warning-themed';
  return 'text-danger-themed';
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
    <div className="mt-2 text-xs text-text-subtle space-y-0.5">
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
    <div className="bg-surface rounded-lg border border-border-themed p-4 space-y-4">
      <h3 className="text-sm font-semibold text-text uppercase tracking-wide">Auto-clear settings</h3>

      <div>
        <div className="text-sm text-text-muted mb-2">Default (applies to everyone unless overridden)</div>
        <div className="flex items-center gap-2">
          <select
            value={defaultMode}
            onChange={(e) => { const m = e.target.value as ClearMode; setDefaultMode(m); saveDefaults(m, defaultHours); }}
            className="bg-bg border border-border-themed rounded px-2 py-1 text-sm text-text"
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
                className="bg-bg border border-border-themed rounded px-2 py-1 text-sm text-text w-16"
              />
              <span className="text-sm text-text-muted">{defaultMode}</span>
            </>
          )}
        </div>
      </div>

      {people.length > 0 && (
        <div>
          <div className="text-sm text-text-muted mb-2">Per person overrides</div>
          <div className="space-y-2">
            {people.map((person) => {
const pref = getPersonPref(person);
const mode: ClearMode = pref?.clearMode ?? defaultMode;
const hours = pref?.clearAfterHours ?? defaultHours;
              return (
                <div key={person} className="flex items-center gap-2 text-sm">
                  <span className="text-text w-24">{person}</span>
                  <select
                    value={mode}
                    onChange={(e) => {
                      const m = e.target.value as ClearMode;
                      savePerson(person, m, hours);
                    }}
                    className="bg-bg border border-border-themed rounded px-2 py-1 text-sm text-text"
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
                        className="bg-bg border border-border-themed rounded px-2 py-1 text-sm text-text w-16"
                      />
                      <span className="text-text-muted">{mode}</span>
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