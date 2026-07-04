'use client';

import { NormalizedEvent } from '@/lib/events';

type Props = {
  events: NormalizedEvent[];
  day: Date;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function DayView({ events, day }: Props) {
  const today = new Date();
  const isToday = today.toDateString() === day.toDateString();

  function eventsForDay(): NormalizedEvent[] {
    const dayStart = new Date(day).setHours(0, 0, 0, 0);
    const dayEnd = new Date(day).setHours(23, 59, 59, 999);
    return events.filter((e) => {
      const s = new Date(e.start).getTime();
      const en = new Date(e.end).getTime();
      return s <= dayEnd && en >= dayStart;
    });
  }

  function formatHour(h: number) {
    if (h === 0) return '12 AM';
    if (h < 12) return h + ' AM';
    if (h === 12) return '12 PM';
    return (h - 12) + ' PM';
  }

  const dayEvents = eventsForDay();
  const allDayEvents = dayEvents.filter((e) => e.allDay);
  const timedEvents = dayEvents.filter((e) => !e.allDay);

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 flex items-baseline gap-3">
        <div className={'text-3xl font-bold ' + (isToday ? 'text-blue-400' : 'text-slate-100')}>{day.getDate()}</div>
        <div className="text-lg text-slate-400">{DAY_LABELS[day.getDay()]}, {day.toLocaleString('default', { month: 'long' })}</div>
      </div>
      {allDayEvents.length > 0 && (
        <div className="px-4 py-2 border-b border-slate-800 space-y-1">
          {allDayEvents.map((event) => (
            <div key={event.id} className="rounded px-2 py-1 text-sm" style={{ backgroundColor: event.color + '33', color: event.color, borderLeft: '3px solid ' + event.color }}>
              {event.title}
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-[80px_1fr] max-h-[70vh] overflow-y-auto">
        <div>
          {HOURS.map((h) => (
            <div key={h} className="h-16 border-b border-slate-800 px-2 py-1 text-xs text-slate-500 text-right">{formatHour(h)}</div>
          ))}
        </div>
        <div className="relative border-l border-slate-800">
          {HOURS.map((h) => (
            <div key={h} className="h-16 border-b border-slate-800"></div>
          ))}
          {timedEvents.map((event) => {
            const evStart = new Date(event.start);
            const evEnd = new Date(event.end);
            const startHours = evStart.getHours() + evStart.getMinutes() / 60;
            const endHours = evEnd.getHours() + evEnd.getMinutes() / 60;
            const top = startHours * 64;
            const height = Math.max((endHours - startHours) * 64, 24);
            return (
              <div key={event.id} className="absolute left-2 right-2 rounded px-2 py-1 text-sm" style={{ top: top + 'px', height: height + 'px', backgroundColor: event.color + '33', color: event.color, borderLeft: '3px solid ' + event.color }}>
                <div className="font-medium truncate">{event.title}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
