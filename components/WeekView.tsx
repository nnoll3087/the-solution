'use client';

import { NormalizedEvent } from '@/lib/events';

type Props = {
  events: NormalizedEvent[];
  weekStart: Date;
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

  const columns: (typeof timed[number] & { column: number })[][] = [];
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
      const height = Math.max((endHours - startHours) * 64, 20);
      const widthPct = 100 / maxCol;
      const leftPct = item.column * widthPct;
      positioned.push({ event: item.event, top, height, leftPct, widthPct });
    }
  }

  return positioned;
}

export function WeekView({ events, weekStart, onEventClick, onSlotClick }: Props) {
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

  function handleSlotClick(day: Date, hour: number) {
    if (!onSlotClick) return;
    const d = new Date(day);
    d.setHours(hour, 0, 0, 0);
    onSlotClick(d);
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
          const allDay = dayEvents.filter((e) => e.allDay);
          const positioned = layoutTimedEvents(dayEvents);
          return (
            <div key={di} className="relative border-l border-slate-800">
              {HOURS.map((h) => (
                <div
                  key={h}
                  onClick={() => handleSlotClick(day, h)}
                  className="h-16 border-b border-slate-800 cursor-pointer hover:bg-slate-800/40 transition"
                />
              ))}
              {allDay.map((event, i) => (
                <button
                  key={di + '-allday-' + i + '-' + event.id}
                  onClick={(e) => { e.stopPropagation(); onEventClick && onEventClick(event); }}
                  className="absolute left-1 right-1 rounded px-1.5 py-0.5 text-xs truncate text-left hover:brightness-125 transition"
                  style={{ top: i * 20 + 'px', backgroundColor: event.color + '33', color: event.color, borderLeft: '3px solid ' + event.color }}
                >
                  {event.title}
                </button>
              ))}
              {positioned.map((p, i) => (
                <button
                  key={di + '-timed-' + i + '-' + p.event.id}
                  onClick={(e) => { e.stopPropagation(); onEventClick && onEventClick(p.event); }}
                  className="absolute rounded px-1 py-0.5 text-xs truncate text-left hover:brightness-125 transition"
                  style={{
                    top: p.top + 'px',
                    height: p.height + 'px',
                    left: 'calc(' + p.leftPct + '% + 2px)',
                    width: 'calc(' + p.widthPct + '% - 4px)',
                    backgroundColor: p.event.color + '33',
                    color: p.event.color,
                    borderLeft: '3px solid ' + p.event.color,
                  }}
                >
                  {p.event.title}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}