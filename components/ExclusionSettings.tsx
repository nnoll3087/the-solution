'use client';

import { useState } from 'react';

type Props = {
  initialPhrases: string[];
};

export function ExclusionSettings({ initialPhrases }: Props) {
  const [phrases, setPhrases] = useState<string[]>(
    initialPhrases.length > 0 ? initialPhrases : ['']
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function updatePhrase(idx: number, value: string) {
    setPhrases(phrases.map((p, i) => (i === idx ? value : p)));
  }

  function addPhrase() {
    setPhrases([...phrases, '']);
  }

  function removePhrase(idx: number) {
    const next = phrases.filter((_, i) => i !== idx);
    setPhrases(next.length > 0 ? next : ['']);
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    await fetch('/api/exclusions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ excludedTitles: phrases.filter((p) => p.trim()) }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const inputCls = 'bg-bg/50 border border-border-themed rounded-md px-2 py-1.5 text-sm text-text';

  return (
    <div className="space-y-4">
      <p className="text-xs text-text-subtle">
        Events whose title contains any of these phrases are hidden everywhere in The Solution.
        They stay untouched on the Google calendar itself.
      </p>
      <div className="space-y-2">
        {phrases.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={p}
              onChange={(e) => updatePhrase(i, e.target.value)}
              placeholder="Title contains... e.g. Cori Work"
              className={inputCls + ' flex-1 min-w-[160px]'}
            />
            <button onClick={() => removePhrase(i)} className="text-text-subtle hover:text-text px-1">×</button>
          </div>
        ))}
        <button onClick={addPhrase} className="text-sm text-accent hover:brightness-125">+ Add phrase</button>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save hidden events'}
        </button>
        {saved && <span className="text-sm text-success-themed">Saved</span>}
      </div>
    </div>
  );
}
