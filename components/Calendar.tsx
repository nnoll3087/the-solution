'use client';

import { useEffect, useState } from 'react';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { EventModal } from './EventModal';
import { NormalizedEvent } from '@/lib/events';

type ViewMode = 'month' | 'week' | 'day';

export function Calendar() {
  const [current, setCurrent] = useState<Date>(new Date());
  const [view, setView] = useState<ViewMode>('month');
  const [events, setEvents] = useState<NormalizedEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<NormalizedEvent | null>(null);

  const year = current.getFullYear();
  const month = current.getMonth();

  function getRange(): [Date, Date] {
    if (view === 'month') {
      return [new Date(year, month, 1), new Date(year, month + 1, 0, 23, 59, 59)];
    }
    if (view === 'week') {
      const s = new Date(current);
      s.setDate(current.getDate() - current.getDay());
      s.setHours(0, 0, 0, 0);
      const e = new Date(s);
      e.setDate(s.getDate() + 6);
      e.setHours(23, 59, 59, 999);
      return [s, e];
    }
    const ds = new Date(current); ds.setHours(0, 0, 0, 0);
    const de = new Date(current); de.setHours(23, 59, 59, 999);
    return [ds, de];
  }

  useEffect(() => {
    const [tMin, tMax] = getRange();
    setLoading(true);
    fetch('/api/events?timeMin=' + encodeURIComponent(tMin.toISOString()) + '&timeMax=' + encodeURIComponent(tMax.toISOString()))
      .then((r) => r.json())
      .then((data) => setEvents(data.events || []))
      .finally(() => setLoading(false));
  }, [current.getTime(), view]);

  function goPrev() {
    const d = new Date(current);
    if (view === 'month') d.setMonth(d.getMonth() - 1);
    else if (view === 'week') d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrent(d);
  }
  function goNext() {
    const d = new Date(current);
    if (view === 'month') d.setMonth(d.getMonth() + 1);
    else if (view === 'week') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrent(d);
  }
  function goToday() { setCurrent(new Date()); }

  function headerLabel(): string {
    if (view === 'month') return current.toLocaleString('default', { month: 'long', year: 'numeric' });
    if (view === 'week') {
      const [s, e] = getRange();
      const sm = s.toLocaleString('default', { month: 'short', day: 'numeric' });
      const em = e.toLocaleString('default', { month: 'short', day: 'numeric' });
      return sm + ' to ' + em + ', ' + s.getFullYear();
    }
    return current.toLocaleString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  const weekStart = new Date(current);
  weekStart.setDate(current.getDate() - current.getDay());
  weekStart.setHours(0, 0, 0, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-2xl font-semibold text-slate-200">{headerLabel()}</div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden border border-slate-800 mr-2">
            <button onClick={() => setView('month')} className={'px-3 py-2 text-sm capitalize ' + (view === 'month' ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300')}>month</button>
            <button onClick={() => setView('week')} className={'px-3 py-2 text-sm capitalize ' + (view === 'week' ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300')}>week</button>
            <button onClick={() => setView('day')} className={'px-3 py-2 text-sm capitalize ' + (view === 'day' ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300')}>day</button>
          </div>
          <button onClick={goPrev} className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm">Prev</button>
          <button onClick={goToday} className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm">Today</button>
          <button onClick={goNext} className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm">Next</button>
        </div>
      </div>
      <div className={loading ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
        {view === 'month' && <MonthView events={events} year={year} month={month} onEventClick={setSelectedEvent} />}
        {view === 'week' && <WeekView events={events} weekStart={weekStart} onEventClick={setSelectedEvent} />}
        {view === 'day' && <DayView events={events} day={current} onEventClick={setSelectedEvent} />}
      </div>
      <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  );
}