'use client';

import { useState } from 'react';

type CalendarOption = {
  accountEmail: string;
  calendarId: string;
  displayName: string;
};

type Rule = { match: string; label: string; color: string };

type Props = {
  calendars: CalendarOption[];
  initialCalendarKey: string;
  initialRules: Rule[];
};

const PRESETS = ['#a855f7', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#14b8a6'];

export function CustodySettings({ calendars, initialCalendarKey, initialRules }: Props) {
  const [calendarKey, setCalendarKey] = useState(initialCalendarKey);
  const [rules, setRules] = useState<Rule[]>(
    initialRules.length > 0 ? initialRules : [{ match: '', label: '', color: PRESETS[0] }]
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function updateRule(idx: number, patch: Partial<Rule>) {
    setRules(rules.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function addRule() {
    setRules([...rules, { match: '', label: '', color: PRESETS[rules.length % PRESETS.length] }]);
  }

  function removeRule(idx: number) {
    setRules(rules.filter((_, i) => i !== idx));
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    await fetch('/api/custody', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ calendarKey, rules: rules.filter((r) => r.match.trim()) }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const inputCls = 'bg-bg/50 border border-border-themed rounded-md px-2 py-1.5 text-sm text-text';

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs uppercase tracking-wide text-text-muted mb-1">Custody calendar</label>
        <select value={calendarKey} onChange={(e) => setCalendarKey(e.target.value)} className={inputCls + ' w-full'}>
          <option value="">Off</option>
          {calendars.map((c) => {
            const key = c.accountEmail + '::' + c.calendarId;
            return (
              <option key={key} value={key}>{c.displayName}</option>
            );
          })}
        </select>
        <p className="text-xs text-text-subtle mt-1">
          All-day events on this calendar whose title contains a rule&apos;s match text are hidden from
          event lists and instead color the whole day.
        </p>
      </div>

      {calendarKey && (
        <div className="space-y-2">
          <label className="block text-xs uppercase tracking-wide text-text-muted">Rules</label>
          {rules.map((r, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={r.match}
                onChange={(e) => updateRule(i, { match: e.target.value })}
                placeholder="Title contains... e.g. Nathan and Edie"
                className={inputCls + ' flex-1 min-w-[160px]'}
              />
              <input
                type="text"
                value={r.label}
                onChange={(e) => updateRule(i, { label: e.target.value })}
                placeholder="Label, e.g. Edie with Nathan"
                className={inputCls + ' flex-1 min-w-[140px]'}
              />
              <span className="flex items-center gap-1">
                {PRESETS.map((c) => (
                  <button
                    key={c}
                    onClick={() => updateRule(i, { color: c })}
                    className={'w-6 h-6 rounded-full transition ' + (r.color === c ? 'ring-2 ring-white' : 'hover:scale-110')}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  value={r.color}
                  onChange={(e) => updateRule(i, { color: e.target.value })}
                  className="w-7 h-7 bg-bg rounded cursor-pointer border border-border-themed"
                  title="Custom color"
                />
              </span>
              <button onClick={() => removeRule(i)} className="text-text-subtle hover:text-text px-1">×</button>
            </div>
          ))}
          <button onClick={addRule} className="text-sm text-accent hover:brightness-125">+ Add rule</button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save custody settings'}
        </button>
        {saved && <span className="text-sm text-success-themed">Saved</span>}
      </div>
    </div>
  );
}
