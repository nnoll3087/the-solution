'use client';

import { useState } from 'react';

export function MealsVisibilityToggle({ initialVisible }: { initialVisible: boolean }) {
  const [visible, setVisible] = useState(initialVisible);
  const [saving, setSaving] = useState(false);

  async function toggle(next: boolean) {
    setVisible(next);
    setSaving(true);
    await fetch('/api/settings/meals-visible', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mealsVisible: next }),
    }).catch(() => {});
    setSaving(false);
  }

  return (
    <label className="flex items-center gap-3 text-sm cursor-pointer">
      <input
        type="checkbox"
        checked={visible}
        disabled={saving}
        onChange={(e) => toggle(e.target.checked)}
        className="w-4 h-4 accent-[var(--theme-accent)]"
      />
      <span className="text-text">Show planned meals on the calendar (day, week, and month views)</span>
    </label>
  );
}
