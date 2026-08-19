'use client';

import { useState } from 'react';

export function ForceRefreshButton() {
  const [refreshing, setRefreshing] = useState(false);

  async function forceRefresh() {
    setRefreshing(true);
    if ('caches' in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {
        // Cache Storage isn't available everywhere; the cache-busting reload below still works.
      }
    }
    const url = new URL('/', window.location.origin);
    url.searchParams.set('_', Date.now().toString());
    window.location.href = url.toString();
  }

  return (
    <button
      onClick={forceRefresh}
      disabled={refreshing}
      className="px-4 py-2.5 rounded-lg bg-surface hover:bg-surface-elevated border border-border-themed text-text text-sm font-medium transition disabled:opacity-50"
    >
      {refreshing ? 'Refreshing...' : '↻ Force refresh'}
    </button>
  );
}
