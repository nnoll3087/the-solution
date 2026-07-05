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
};

export function QueuePreview() {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  function load() {
    fetch('/api/queue')
      .then((r) => r.json())
      .then((data) => setEntries(data.entries || []))
      .finally(() => setLoading(false));
  }

  const active = entries.filter((e) => !e.dismissedAt);
  const byPerson: Record<string, QueueEntry[]> = {};
  active.forEach((e) => {
    if (!byPerson[e.displayName]) byPerson[e.displayName] = [];
    byPerson[e.displayName].push(e);
  });

  const people = Object.keys(byPerson).sort();

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg font-semibold text-slate-100">What&apos;s new</h2>
        <a href="/queue" className="text-xs text-blue-400 hover:text-blue-300">
          View all
        </a>
      </div>

      {loading && active.length === 0 && (
        <p className="text-sm text-slate-500">Checking for updates...</p>
      )}

      {!loading && active.length === 0 && (
        <p className="text-sm text-slate-500">All caught up.</p>
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
              <li key={person} className="flex items-center justify-between bg-slate-950 rounded-md px-3 py-2 border border-slate-800">
                <span className="text-sm font-medium text-slate-200">{person}</span>
                <span className="text-xs text-slate-400">{parts.join(', ')}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
