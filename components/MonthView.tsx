'use client';

import { NormalizedEvent } from '@/lib/events';
import { eventOnDay } from '@/lib/dates';
import { TagDots } from './TagDots';

type Props = {
  events: NormalizedEvent[];
  custodyEvents?: NormalizedEvent[];
  year: number;
  month: number;
  onEventClick?: (event: NormalizedEvent) => void;
  onDayClick?: (date: Date) => void;
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function MonthView({ events, custodyEvents = [], year, month, onEventClick, onDayClick }: Props) {
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
    return events.filter((e) => eventOnDay(e, dayStart, dayEnd));
  }

  function custodyForDay(day: number) {
    const dayStart = new Date(year, month, day).setHours(0, 0, 0, 0);
    const dayEnd = new Date(year, month, day).setHours(23, 59, 59, 999);
    return custodyEvents.find((e) => eventOnDay(e, dayStart, dayEnd))?.custody;
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
          const custody = day ? custodyForDay(day) : undefined;
          return (
            <div
              key={idx}
              onClick={day ? () => handleDayClick(day) : undefined}
              className={'min-h-[72px] sm:min-h-[112px] border-b border-r border-border-themed p-1 sm:p-1.5 ' + (day ? 'cursor-pointer hover:brightness-110 transition ' + (custody ? '' : 'bg-bg/60') : 'bg-surface/30')}
              style={custody ? { backgroundColor: custody.color + '2e' } : undefined}
              title={custody?.label}
            >
              {day && (
                <>
                  <div className={'text-sm font-medium mb-0.5 ' + (isToday ? 'text-accent' : 'text-text-muted')}>
                    {isToday ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-accent text-white rounded-full text-xs">{day}</span>
                    ) : (day)}
                  </div>
                  {/* Phones: color dots only; the agenda view is the readable list there */}
                  <div className="flex flex-wrap gap-1 sm:hidden">
                    {dayEvents.slice(0, 8).map((event, i) => (
                      <span key={event.id + '-' + i} className="w-2 h-2 rounded-full" style={{ backgroundColor: event.color }} />
                    ))}
                  </div>
                  <div className="hidden sm:block space-y-0.5">
                    {dayEvents.slice(0, 5).map((event, i) => (
                      <button
                        key={event.id + '-' + i}
                        onClick={(e) => { e.stopPropagation(); onEventClick && onEventClick(event); }}
                        className="flex w-full items-center gap-1 text-left text-xs rounded px-1 py-px text-text hover:brightness-110 transition"
                        style={{ backgroundColor: event.color + '30', borderLeft: '3px solid ' + event.color }}
                      >
                        <span className="truncate flex-1 leading-5">{event.title}</span>
                        <TagDots alsoFor={event.alsoFor} />
                      </button>
                    ))}
                    {dayEvents.length > 5 && (
                      <div className="text-xs text-text-subtle px-1">+{dayEvents.length - 5} more</div>
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