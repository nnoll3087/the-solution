'use client';

import { NormalizedEvent } from '@/lib/events';

type Props = {
  events: NormalizedEvent[];
  year: number;
  month: number;
  onEventClick?: (event: NormalizedEvent) => void;
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function MonthView({ events, year, month, onEventClick }: Props) {
  const firstOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDate = today.getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function eventsForDay(day: number): NormalizedEvent[] {
    const dayStart = new Date(year, month, day).setHours(0, 0, 0, 0);
    const dayEnd = new Date(year, month, day).setHours(23, 59, 59, 999);
    return events.filter((e) => {
      const evStart = new Date(e.start).getTime();
      const evEnd = new Date(e.end).getTime();
      return evStart <= dayEnd && evEnd >= dayStart;
    });
  }

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-800">
        {DAY_LABELS.map((label) => (
          <div key={label} className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide text-center">{label}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          const isToday = isCurrentMonth && day === todayDate;
          const dayEvents = day ? eventsForDay(day) : [];
          return (
            <div key={idx} className={'min-h-[120px] border-b border-r border-slate-800 p-2 ' + (day ? 'bg-slate-950' : 'bg-slate-900/40')}>
              {day && (
                <>
                  <div className={'text-sm font-medium mb-1 ' + (isToday ? 'text-blue-400' : 'text-slate-300')}>
                    {isToday ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-500 text-white rounded-full text-xs">{day}</span>
                    ) : (day)}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <button key={event.id} onClick={() => onEventClick && onEventClick(event)} className="block w-full text-left text-xs truncate rounded px-1.5 py-0.5 hover:brightness-125 transition" style={{ backgroundColor: event.color + '33', color: event.color, borderLeft: '3px solid ' + event.color }}>
                        {event.title}
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-slate-500 px-1.5">+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
