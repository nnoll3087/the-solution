'use client';

import { useState } from 'react';
import { hardRefresh } from '@/lib/hardRefresh';

export function ForceRefreshButton() {
  const [refreshing, setRefreshing] = useState(false);

  async function forceRefresh() {
    setRefreshing(true);
    await hardRefresh('/');
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
