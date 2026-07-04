'use client';

import { NormalizedEvent } from '@/lib/events';

type Props = {
  events: NormalizedEvent[];
  weekStart: Date;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function WeekView({ events, weekStart }: Props) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function eventsForDay(day: Date): NormalizedEvent[] {
    const dayStart = new Date(day).setHours(0, 0, 0, 0);
    const dayEnd = new Date(day).setHours(23, 59, 59, 999);
    return events.filter((e) => {
      const s = new Date(e.start).getTime();
      const en = new Date(e.end).getTime();
      return s <= dayEnd && en >= dayStart;
    });
  }

  function formatHour(h: number) {
    if (h === 0) return '12a';
    if (h < 12) return h + 'a';
    if (h === 12) return '12p';
    return (h - 12) + 'p';
  }

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
      <div className="grid grid-cols-8 border-b border-slate-800">
        <div className="px-2 py-2 text-xs text-slate-500"></div>
        {days.map((d, i) => {
          const isToday = isSameDay(d, today);
          return (
            <div key={i} className="px-2 py-2 text-center border-l border-slate-800">
              <div className="text-xs text-slate-400 uppercase tracking-wide">{DAY_LABELS[d.getDay()]}</div>
              <div className={'text-lg font-semibold ' + (isToday ? 'text-blue-400' : 'text-slate-200')}>{d.getDate()}</div>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-8 max-h-[70vh] overflow-y-auto">
        <div>
          {HOURS.map((h) => (
            <div key={h} className="h-16 border-b border-slate-800 px-2 py-1 text-xs text-slate-500 text-right">{formatHour(h)}</div>
          ))}
        </div>
        {days.map((day, di) => {
          const dayEvents = eventsForDay(day);
          return (
            <div key={di} className="relative border-l border-slate-800">
              {HOURS.map((h) => (
                <div key={h} className="h-16 border-b border-slate-800"></div>
              ))}
              {dayEvents.map((event) => {
                const evStart = new Date(event.start);
                const evEnd = new Date(event.end);
                if (event.allDay) {
                  return (
                    <div key={event.id} className="absolute left-1 right-1 top-0 rounded px-1.5 py-0.5 text-xs truncate" style={{ backgroundColor: event.color + '33', color: event.color, borderLeft: '3px solid ' + event.color }}>
                      {event.title}
                    </div>
                  );
                }
                const startHours = evStart.getHours() + evStart.getMinutes() / 60;
                const endHours = evEnd.getHours() + evEnd.getMinutes() / 60;
                const top = startHours * 64;
                const height = Math.max((endHours - startHours) * 64, 20);
                return (
                  <div key={event.id} className="absolute left-1 right-1 rounded px-1.5 py-0.5 text-xs truncate" style={{ top: top + 'px', height: height + 'px', backgroundColor: event.color + '33', color: event.color, borderLeft: '3px solid ' + event.color }}>
                    {event.title}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
