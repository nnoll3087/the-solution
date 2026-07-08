'use client';

import { useEffect, useState } from 'react';

type QueueEntry = {
  id: string;
  type: 'new' | 'changed' | 'deleted';
  eventId: string;
  calendarId: string;
  accountEmail: string;
  displayName: string;
  title: string;
  start: string;
  end: string;
  detectedAt: string;
  dismissedAt?: string;
  alsoFor?: string[];
};

export function QueuePreview() {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    fetch('/api/queue')
      .then((r) => r.json())
      .then((data) => setEntries(data.entries || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = entries.filter((e) => !e.dismissedAt);
  const byPerson: Record<string, QueueEntry[]> = {};
  active.forEach((e) => {
    // Tagged people see the entry under their name too
    const names = [e.displayName, ...(e.alsoFor || [])];
    new Set(names).forEach((n) => {
      if (!byPerson[n]) byPerson[n] = [];
      byPerson[n].push(e);
    });
  });

  const people = Object.keys(byPerson).sort();

  return (
    <div className="bg-surface/80 backdrop-blur rounded-lg border border-border-themed p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg font-semibold text-text">What&apos;s new</h2>
        <a href="/queue" className="text-xs text-accent hover:brightness-125">
          View all
        </a>
      </div>

      {loading && active.length === 0 && (
        <p className="text-sm text-text-subtle">Checking for updates...</p>
      )}

      {!loading && active.length === 0 && (
        <p className="text-sm text-text-subtle">All caught up.</p>
      )}

      {active.length > 0 && (
        <ul className="space-y-2">
          {people.map((person) => {
            const items = byPerson[person];
            const news = items.filter((i) => i.type === 'new').length;
            const changes = items.filter((i) => i.type === 'changed').length;
            const deletes = items.filter((i) => i.type === 'deleted').length;
            const parts: string[] = [];
            if (news) parts.push(news + ' new');
            if (changes) parts.push(changes + ' changed');
            if (deletes) parts.push(deletes + ' removed');
            return (
              <li key={person}>
                <a
                  href={'/queue?person=' + encodeURIComponent(person)}
                  className="flex items-center justify-between bg-bg/60 rounded-md px-3 py-2.5 min-h-[44px] border border-border-themed hover:bg-surface-elevated/60 transition"
                >
                  <span className="text-sm font-medium text-text">{person}</span>
                  <span className="text-xs text-text-muted">{parts.join(', ')}</span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}