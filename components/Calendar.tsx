'use client';

import { useEffect, useState, useCallback } from 'react';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { EventModal } from './EventModal';
import { EventFormPanel } from './EventFormPanel';
import { NormalizedEvent } from '@/lib/events';

type ViewMode = 'month' | 'week' | 'day';

export function Calendar() {
  const [current, setCurrent] = useState<Date>(new Date());
  const [view, setView] = useState<ViewMode>('month');
  const [events, setEvents] = useState<NormalizedEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<NormalizedEvent | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formInitialStart, setFormInitialStart] = useState<Date | undefined>(undefined);
  const [formEditing, setFormEditing] = useState<NormalizedEvent | null>(null);

  const year = current.getFullYear();
  const month = current.getMonth();

  const getRange = useCallback((): [Date, Date] => {
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
  }, [view, year, month, current]);

  const loadEvents = useCallback(() => {
    const [tMin, tMax] = getRange();
    setLoading(true);
    fetch('/api/events?timeMin=' + encodeURIComponent(tMin.toISOString()) + '&timeMax=' + encodeURIComponent(tMax.toISOString()))
      .then((r) => r.json())
      .then((data) => setEvents(data.events || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [getRange]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

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

  function openCreateForm(initialStart?: Date) {
    setFormEditing(null);
    setFormInitialStart(initialStart);
    setFormOpen(true);
  }

  function goToDay(d: Date) {
    setCurrent(d);
    setView('day');
  }

  function createOnViewedDay() {
    const now = new Date();
    if (current.toDateString() === now.toDateString()) {
      openCreateForm();
      return;
    }
    const d = new Date(current);
    d.setHours(9, 0, 0, 0);
    openCreateForm(d);
  }

  function openEditForm(event: NormalizedEvent) {
    setSelectedEvent(null);
    setFormEditing(event);
    setFormInitialStart(undefined);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setFormEditing(null);
  }

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
        <div className="text-2xl font-semibold text-text">{headerLabel()}</div>
        <div className="flex items-center gap-2">
          <button onClick={createOnViewedDay} className="px-3 py-2 rounded-lg bg-success-themed hover:brightness-110 text-white text-sm font-medium mr-2">+ New event</button>
          <div className="flex rounded-lg overflow-hidden border border-border-themed mr-2">
            <button onClick={() => setView('month')} className={'px-3 py-2 text-sm capitalize ' + (view === 'month' ? 'bg-accent text-white' : 'bg-surface hover:bg-surface-elevated text-text-muted')}>month</button>
            <button onClick={() => setView('week')} className={'px-3 py-2 text-sm capitalize ' + (view === 'week' ? 'bg-accent text-white' : 'bg-surface hover:bg-surface-elevated text-text-muted')}>week</button>
            <button onClick={() => setView('day')} className={'px-3 py-2 text-sm capitalize ' + (view === 'day' ? 'bg-accent text-white' : 'bg-surface hover:bg-surface-elevated text-text-muted')}>day</button>
          </div>
          <button onClick={goPrev} className="px-3 py-2 rounded-lg bg-surface hover:bg-surface-elevated text-text text-sm">Prev</button>
          <button onClick={goToday} className="px-3 py-2 rounded-lg bg-surface hover:bg-surface-elevated text-text text-sm">Today</button>
          <button onClick={goNext} className="px-3 py-2 rounded-lg bg-surface hover:bg-surface-elevated text-text text-sm">Next</button>
        </div>
      </div>
      <div className={loading ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
        {view === 'month' && <MonthView events={events} year={year} month={month} onEventClick={setSelectedEvent} onDayClick={goToDay} />}
        {view === 'week' && <WeekView events={events} weekStart={weekStart} onEventClick={setSelectedEvent} onSlotClick={goToDay} />}
        {view === 'day' && <DayView events={events} day={current} onEventClick={setSelectedEvent} onSlotClick={(d) => openCreateForm(d)} />}
      </div>
      <EventModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onEdit={openEditForm}
        onDeleted={loadEvents}
      />
      <EventFormPanel
        open={formOpen}
        onClose={closeForm}
        onSaved={loadEvents}
        initialStart={formInitialStart}
        existingEvent={formEditing}
      />
    </div>
  );
}