'use client';

import { ReactNode, useState } from 'react';

type TabKey = 'calendars' | 'display' | 'photos';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'calendars', label: 'Calendars', icon: '📅' },
  { key: 'display', label: 'Display', icon: '🎨' },
  { key: 'photos', label: 'Photos', icon: '🖼️' },
];

export function SettingsTabs({
  calendars,
  display,
  photos,
}: {
  calendars: ReactNode;
  display: ReactNode;
  photos: ReactNode;
}) {
  const [active, setActive] = useState<TabKey>('calendars');
  const content = active === 'calendars' ? calendars : active === 'display' ? display : photos;

  return (
    <div>
      <div className="flex gap-1 mb-6 border-b border-border-themed overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition ' +
              (active === t.key
                ? 'border-accent text-text'
                : 'border-transparent text-text-muted hover:text-text')
            }
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      {content}
    </div>
  );
}
