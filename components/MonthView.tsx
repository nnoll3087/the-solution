'use client';

import { NormalizedEvent } from '@/lib/events';

type Props = {
  events: NormalizedEvent[];
  year: number;
  month: number;
  onEventClick?: (event: NormalizedEvent) => void;
  onDayClick?: (date: Date) => void;
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function MonthView({ events, year, month, onEventClick, onDayClick }: Props) {
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

  function handleDayClick(day: number) {
    if (!onDayClick) return;
    const d = new Date(year, month, day);
    d.setHours(9, 0, 0, 0);
    onDayClick(d);
  }

  return (
    <div className="bg-surface/80 backdrop-blur rounded-lg border border-border-themed overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border-themed">
        {DAY_LABELS.map((label) => (
          <div key={label} className="px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wide text-center">{label}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          const isToday = isCurrentMonth && day === todayDate;
          const dayEvents = day ? eventsForDay(day) : [];
          return (
            <div
              key={idx}
              onClick={day ? () => handleDayClick(day) : undefined}
              className={'min-h-[120px] border-b border-r border-border-themed p-2 ' + (day ? 'bg-bg/60 cursor-pointer hover:bg-surface/70 transition' : 'bg-surface/30')}
            >
              {day && (
                <>
                  <div className={'text-sm font-medium mb-1 ' + (isToday ? 'text-accent' : 'text-text-muted')}>
                    {isToday ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-accent text-white rounded-full text-xs">{day}</span>
                    ) : (day)}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <button
                        key={event.id}
                        onClick={(e) => { e.stopPropagation(); onEventClick && onEventClick(event); }}
                        className="block w-full text-left text-xs truncate rounded px-1.5 py-0.5 hover:brightness-125 transition"
                        style={{ backgroundColor: event.color + '33', color: event.color, borderLeft: '3px solid ' + event.color }}
                      >
                        {event.title}
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-text-subtle px-1.5">+{dayEvents.length - 3} more</div>
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