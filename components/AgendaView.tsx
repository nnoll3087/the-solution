'use client';

import { NormalizedEvent } from '@/lib/events';
import { eventOnDay } from '@/lib/dates';
import { TagDots } from './TagDots';

type Props = {
  events: NormalizedEvent[];
  custodyEvents?: NormalizedEvent[];
  startDate: Date;
  days: number;
  onEventClick?: (event: NormalizedEvent) => void;
};

function dayLabel(d: Date, today: Date): string {
  const diff = Math.round((d.setHours(0, 0, 0, 0) - new Date(today).setHours(0, 0, 0, 0)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleString('default', { weekday: 'long' });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('default', { hour: 'numeric', minute: '2-digit' });
}

export function AgendaView({ events, custodyEvents = [], startDate, days, onEventClick }: Props) {
  const today = new Date();

  const dayList: { date: Date; events: NormalizedEvent[]; custody?: { color: string; label: string } }[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dayStart = new Date(date).setHours(0, 0, 0, 0);
    const dayEnd = new Date(date).setHours(23, 59, 59, 999);
    const dayEvents = events
      .filter((e) => eventOnDay(e, dayStart, dayEnd))
      .sort((a, b) => {
        if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
        return new Date(a.start).getTime() - new Date(b.start).getTime();
      });
    const custody = custodyEvents.find((e) => eventOnDay(e, dayStart, dayEnd))?.custody;
    dayList.push({ date, events: dayEvents, custody });
  }

  // Always show today; skip other empty days so the list stays glanceable
  const visible = dayList.filter((d, i) => i === 0 || d.events.length > 0);

  return (
    <div className="bg-surface/80 backdrop-blur rounded-lg border border-border-themed overflow-hidden divide-y divide-[var(--theme-border)]">
      {visible.map(({ date, events: dayEvents, custody }) => {
        const isToday = date.toDateString() === today.toDateString();
        return (
          <div key={date.toISOString()} className="px-4 py-3">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={'text-sm font-bold uppercase tracking-wide ' + (isToday ? 'text-accent' : 'text-text')}>
                {dayLabel(new Date(date), today)}
              </span>
              <span className="text-sm text-text-muted">
                {date.toLocaleString('default', { month: 'short', day: 'numeric' })}
              </span>
              {custody && (
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: custody.color + '2e', color: custody.color }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: custody.color }} />
                  {custody.label}
                </span>
              )}
            </div>
            {dayEvents.length === 0 ? (
              <p className="text-sm text-text-subtle py-1">Nothing scheduled</p>
            ) : (
              <ul className="space-y-1">
                {dayEvents.map((event, i) => (
                  <li key={event.id + '-' + i}>
                    <button
                      onClick={() => onEventClick && onEventClick(event)}
                      className="w-full flex items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-surface-elevated/60 transition min-h-[44px]"
                    >
                      <span className="w-14 flex-shrink-0 text-sm text-text-muted tabular-nums">
                        {event.allDay ? 'All day' : fmtTime(event.start)}
                      </span>
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: event.color }} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-base text-text truncate">{event.title}</span>
                        {event.location && (
                          <span className="block text-xs text-text-subtle truncate">{event.location}</span>
                        )}
                      </span>
                      <span className="text-xs text-text-muted flex-shrink-0">{event.displayName}</span>
                      <TagDots alsoFor={event.alsoFor} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
