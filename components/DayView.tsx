'use client';

import { NormalizedEvent } from '@/lib/events';
import { TagDots } from './TagDots';

type Props = {
  events: NormalizedEvent[];
  day: Date;
  onEventClick?: (event: NormalizedEvent) => void;
  onSlotClick?: (date: Date) => void;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type PositionedEvent = {
  event: NormalizedEvent;
  top: number;
  height: number;
  leftPct: number;
  widthPct: number;
};

function layoutTimedEvents(events: NormalizedEvent[]): PositionedEvent[] {
  const timed = events.filter((e) => !e.allDay).map((e) => ({
    event: e,
    start: new Date(e.start).getTime(),
    end: new Date(e.end).getTime(),
  }));
  timed.sort((a, b) => a.start - b.start || b.end - a.end);

  const positioned: PositionedEvent[] = [];
  const clusters: (typeof timed[number] & { column: number })[][] = [];
  let currentCluster: (typeof timed[number] & { column: number })[] = [];
  let currentClusterEnd = 0;

  for (const item of timed) {
    if (currentCluster.length === 0 || item.start >= currentClusterEnd) {
      if (currentCluster.length > 0) clusters.push(currentCluster);
      currentCluster = [];
      currentClusterEnd = item.end;
    } else {
      currentClusterEnd = Math.max(currentClusterEnd, item.end);
    }
    const cols = currentCluster.reduce((acc: number[][], e) => {
      if (!acc[e.column]) acc[e.column] = [];
      acc[e.column].push(e.end);
      return acc;
    }, []);
    let chosen = 0;
    while (cols[chosen] && cols[chosen].some((endTime) => endTime > item.start)) chosen++;
    currentCluster.push({ ...item, column: chosen });
  }
  if (currentCluster.length > 0) clusters.push(currentCluster);

  for (const cluster of clusters) {
    const maxCol = Math.max(...cluster.map((c) => c.column)) + 1;
    for (const item of cluster) {
      const evStart = new Date(item.event.start);
      const evEnd = new Date(item.event.end);
      const startHours = evStart.getHours() + evStart.getMinutes() / 60;
      const endHours = evEnd.getHours() + evEnd.getMinutes() / 60;
      const top = startHours * 64;
      const height = Math.max((endHours - startHours) * 64, 24);
      const widthPct = 100 / maxCol;
      const leftPct = item.column * widthPct;
      positioned.push({ event: item.event, top, height, leftPct, widthPct });
    }
  }

  return positioned;
}

export function DayView({ events, day, onEventClick, onSlotClick }: Props) {
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

  function handleSlotClick(hour: number) {
    if (!onSlotClick) return;
    const d = new Date(day);
    d.setHours(hour, 0, 0, 0);
    onSlotClick(d);
  }

  const dayEvents = eventsForDay();
  const allDayEvents = dayEvents.filter((e) => e.allDay);
  const positioned = layoutTimedEvents(dayEvents);

  return (
    <div className="bg-surface/80 backdrop-blur rounded-lg border border-border-themed overflow-hidden">
      <div className="px-4 py-3 border-b border-border-themed flex items-baseline gap-3">
        <div className={'text-3xl font-bold ' + (isToday ? 'text-accent' : 'text-text')}>{day.getDate()}</div>
        <div className="text-lg text-text-muted">{DAY_LABELS[day.getDay()]}, {day.toLocaleString('default', { month: 'long' })}</div>
      </div>
      {allDayEvents.length > 0 && (
        <div className="px-4 py-2 border-b border-border-themed space-y-1">
          {allDayEvents.map((event, i) => (
            <button
              key={'day-allday-' + i + '-' + event.id}
              onClick={(e) => { e.stopPropagation(); onEventClick && onEventClick(event); }}
              className="flex w-full items-center gap-1.5 text-left rounded px-2 py-1 text-sm hover:brightness-125 transition"
              style={{ backgroundColor: event.color + '33', color: event.color, borderLeft: '3px solid ' + event.color }}
            >
              <span className="truncate flex-1">{event.title}</span>
              <TagDots alsoFor={event.alsoFor} />
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-[80px_1fr] max-h-[70vh] overflow-y-auto">
        <div>
          {HOURS.map((h) => (
            <div key={h} className="h-16 border-b border-border-themed px-2 py-1 text-xs text-text-subtle text-right">{formatHour(h)}</div>
          ))}
        </div>
        <div className="relative border-l border-border-themed">
          {HOURS.map((h) => (
            <div
              key={h}
              onClick={() => handleSlotClick(h)}
              className="h-16 border-b border-border-themed cursor-pointer hover:bg-surface-elevated/40 transition"
            />
          ))}
          {positioned.map((p, i) => (
            <button
              key={'day-timed-' + i + '-' + p.event.id}
              onClick={(e) => { e.stopPropagation(); onEventClick && onEventClick(p.event); }}
              className="absolute rounded px-2 py-1 text-sm text-left hover:brightness-125 transition"
              style={{
                top: p.top + 'px',
                height: p.height + 'px',
                left: 'calc(' + p.leftPct + '% + 8px)',
                width: 'calc(' + p.widthPct + '% - 16px)',
                backgroundColor: p.event.color + '33',
                color: p.event.color,
                borderLeft: '3px solid ' + p.event.color,
              }}
            >
              <div className="flex items-center gap-1.5">
                <span className="font-medium truncate flex-1">{p.event.title}</span>
                <TagDots alsoFor={p.event.alsoFor} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}