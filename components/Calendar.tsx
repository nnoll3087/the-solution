'use client';

import { useEffect, useState, useCallback } from 'react';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { AgendaView } from './AgendaView';
import { EventModal } from './EventModal';
import { EventFormPanel } from './EventFormPanel';
import { NormalizedEvent } from '@/lib/events';

type ViewMode = 'agenda' | 'day' | 'week' | 'month';

type CalendarOption = {
  accountEmail: string;
  calendarId: string;
  displayName: string;
  color: string;
};

const AGENDA_DAYS = 14;
const FILTER_STORAGE_KEY = 'solution-person-filter';

export function Calendar() {
  const [current, setCurrent] = useState<Date>(new Date());
  const [view, setView] = useState<ViewMode>('month');
  const [calendars, setCalendars] = useState<CalendarOption[]>([]);
  // null = everyone (no filter applied yet / Family)
  const [selectedKeys, setSelectedKeys] = useState<Set<string> | null>(null);

  // Phones default to the agenda; set after mount to avoid a hydration mismatch
  useEffect(() => {
    if (window.innerWidth < 1024) setView('agenda');
  }, []);

  useEffect(() => {
    fetch('/api/calendars/list')
      .then((r) => r.json())
      .then((data) => setCalendars(data.calendars || []))
      .catch(() => {});
    try {
      const saved = localStorage.getItem(FILTER_STORAGE_KEY);
      if (saved) setSelectedKeys(new Set(JSON.parse(saved)));
    } catch {}
  }, []);

  function persistSelection(keys: Set<string> | null) {
    setSelectedKeys(keys);
    try {
      if (keys === null) localStorage.removeItem(FILTER_STORAGE_KEY);
      else localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify([...keys]));
    } catch {}
  }

  function togglePerson(key: string) {
    // From "everyone", tapping a person focuses on just them
    const next = selectedKeys === null ? new Set([key]) : new Set(selectedKeys);
    if (selectedKeys !== null) {
      if (next.has(key)) next.delete(key);
      else next.add(key);
    }
    // Selecting all people is the same as no filter
    if (next.size === calendars.length) persistSelection(null);
    else persistSelection(next);
  }

  const [events, setEvents] = useState<NormalizedEvent[]>([]);
  const [authErrors, setAuthErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<NormalizedEvent | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formInitialStart, setFormInitialStart] = useState<Date | undefined>(undefined);
  const [formEditing, setFormEditing] = useState<NormalizedEvent | null>(null);

  const year = current.getFullYear();
  const month = current.getMonth();

  function eventVisible(e: NormalizedEvent): boolean {
    if (selectedKeys === null) return true;
    if (selectedKeys.size === 0) return false;
    if (selectedKeys.has(e.accountEmail + '::' + e.calendarId)) return true;
    const tags = e.tags || [];
    if (tags.includes('family')) return true; // family-tagged events are for everyone
    return tags.some((t) => selectedKeys.has(t));
  }

  const visibleEvents = selectedKeys === null ? events : events.filter(eventVisible);
  // Custody-rule matches leave the event lists and instead tint their days
  const custodyEvents = visibleEvents.filter((e) => e.custody);
  const displayEvents = visibleEvents.filter((e) => !e.custody);

  const getRange = useCallback((): [Date, Date] => {
    if (view === 'agenda') {
      const s = new Date(current);
      s.setHours(0, 0, 0, 0);
      const e = new Date(s);
      e.setDate(s.getDate() + AGENDA_DAYS - 1);
      e.setHours(23, 59, 59, 999);
      return [s, e];
    }
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
      .then((data) => {
        setEvents(data.events || []);
        setAuthErrors(data.authErrors || []);
      })
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
    else if (view === 'agenda') d.setDate(d.getDate() - AGENDA_DAYS);
    else d.setDate(d.getDate() - 1);
    setCurrent(d);
  }
  function goNext() {
    const d = new Date(current);
    if (view === 'month') d.setMonth(d.getMonth() + 1);
    else if (view === 'week') d.setDate(d.getDate() + 7);
    else if (view === 'agenda') d.setDate(d.getDate() + AGENDA_DAYS);
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
    if (view === 'agenda') {
      const [s, e] = getRange();
      if (s.toDateString() === new Date().toDateString()) return 'Next ' + AGENDA_DAYS + ' days';
      const sm = s.toLocaleString('default', { month: 'short', day: 'numeric' });
      const em = e.toLocaleString('default', { month: 'short', day: 'numeric' });
      return sm + ' to ' + em + ', ' + s.getFullYear();
    }
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
      {authErrors.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-4 py-3 rounded-lg border border-red-500/40 bg-red-500/10 text-sm text-text">
          <span>
            <span className="font-semibold">Google connection expired</span>
            {' — events from '}
            {authErrors.join(' and ')}
            {' can’t be loaded.'}
          </span>
          <a href="/setup" className="px-3 py-1.5 rounded-lg bg-accent text-white font-medium whitespace-nowrap">
            Reconnect
          </a>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="text-xl sm:text-2xl font-semibold text-text">{headerLabel()}</div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={createOnViewedDay} className="px-3 py-2 min-h-[40px] rounded-lg bg-text text-bg hover:opacity-85 text-sm font-semibold whitespace-nowrap transition">+ New</button>
          <div className="flex rounded-lg overflow-hidden border border-border-themed bg-surface/80 backdrop-blur">
            {(['agenda', 'day', 'week', 'month'] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={'px-2.5 sm:px-3 py-2 min-h-[40px] text-sm capitalize transition ' + (view === v ? 'bg-text text-bg font-semibold' : 'text-text-muted hover:text-text')}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <button onClick={goPrev} className="px-3 py-2 min-h-[40px] rounded-lg bg-surface/80 backdrop-blur border border-border-themed hover:bg-surface-elevated text-text text-sm transition">‹</button>
            <button onClick={goToday} className="px-3 py-2 min-h-[40px] rounded-lg bg-surface/80 backdrop-blur border border-border-themed hover:bg-surface-elevated text-text text-sm whitespace-nowrap transition">Today</button>
            <button onClick={goNext} className="px-3 py-2 min-h-[40px] rounded-lg bg-surface/80 backdrop-blur border border-border-themed hover:bg-surface-elevated text-text text-sm transition">›</button>
          </div>
        </div>
      </div>

      {calendars.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <button
            onClick={() => persistSelection(null)}
            className={
              'px-3 py-1.5 min-h-[36px] rounded-full text-sm font-medium border transition ' +
              (selectedKeys === null
                ? 'bg-text text-bg border-transparent font-semibold'
                : 'bg-surface/80 backdrop-blur text-text-muted border-border-themed hover:text-text')
            }
          >
            Family
          </button>
          {calendars.map((c) => {
            const key = c.accountEmail + '::' + c.calendarId;
            const on = selectedKeys === null || selectedKeys.has(key);
            return (
              <button
                key={key}
                onClick={() => togglePerson(key)}
                className={
                  'inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-full text-sm font-medium border transition ' +
                  (on && selectedKeys !== null
                    ? 'text-white'
                    : on
                      ? 'bg-surface/80 backdrop-blur text-text border-border-themed'
                      : 'bg-surface/40 backdrop-blur text-text-subtle border-border-themed hover:text-text-muted opacity-70')
                }
                style={on && selectedKeys !== null ? { backgroundColor: c.color, borderColor: c.color } : undefined}
              >
                <span
                  className={'w-2.5 h-2.5 rounded-full ' + (on ? '' : 'opacity-40')}
                  style={{ backgroundColor: on && selectedKeys !== null ? 'rgba(255,255,255,0.9)' : c.color }}
                />
                {c.displayName}
              </button>
            );
          })}
        </div>
      )}

      <div className={loading ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
        {view === 'agenda' && <AgendaView events={displayEvents} custodyEvents={custodyEvents} startDate={getRange()[0]} days={AGENDA_DAYS} onEventClick={setSelectedEvent} />}
        {view === 'month' && <MonthView events={displayEvents} custodyEvents={custodyEvents} year={year} month={month} onEventClick={setSelectedEvent} onDayClick={goToDay} />}
        {view === 'week' && <WeekView events={displayEvents} custodyEvents={custodyEvents} weekStart={weekStart} onEventClick={setSelectedEvent} onSlotClick={goToDay} />}
        {view === 'day' && <DayView events={displayEvents} custodyEvents={custodyEvents} day={current} onEventClick={setSelectedEvent} onSlotClick={(d) => openCreateForm(d)} />}
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