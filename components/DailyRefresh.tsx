'use client';

import { useEffect } from 'react';
import { hardRefresh } from '@/lib/hardRefresh';

// Kiosk tabs stay open indefinitely, so once-a-day is a safety net: it picks
// up new deploys, clears any accumulated memory/state, and — combined with
// Slideshow's own background photo refresh — guarantees the photo frame
// never goes more than a day without new uploads. Scheduled for a fixed
// local time rather than "24h from whenever the tab loaded" so it fires
// during a low-traffic overnight window instead of interrupting someone
// mid-glance at the calendar.
const REFRESH_HOUR = 3;

export function DailyRefresh() {
  useEffect(() => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(REFRESH_HOUR, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    const timer = setTimeout(() => hardRefresh('/'), next.getTime() - now.getTime());
    return () => clearTimeout(timer);
  }, []);

  return null;
}
