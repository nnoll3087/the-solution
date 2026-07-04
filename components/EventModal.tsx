'use client';

import { NormalizedEvent } from '@/lib/events';
import { useEffect } from 'react';

type Props = {
  event: NormalizedEvent | null;
  onClose: () => void;
};

export function EventModal({ event, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!event) return null;

  const start = new Date(event.start);
  const end = new Date(event.end);

  function fmtDate(d: Date) {
    return d.toLocaleString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }
  function fmtTime(d: Date) {
    return d.toLocaleString('default', { hour: 'numeric', minute: '2-digit' });
  }

  function timeLabel(): string {
    if (event.allDay) return 'All day, ' + fmtDate(start);
    const sameDay = start.toDateString() === end.toDateString();
    if (sameDay) return fmtDate(start) + ', ' + fmtTime(start) + ' to ' + fmtTime(end);
    return fmtDate(start) + ' ' + fmtTime(start) + ' to ' + fmtDate(end) + ' ' + fmtTime(end);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 rounded-xl border border-slate-800 max-w-lg w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3 flex-1">
            <span className="w-4 h-4 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: event.color }} />
            <div>
              <h2 className="text-xl font-semibold text-slate-100">{event.title}</h2>
              <p className="text-sm text-slate-400 mt-0.5">{event.displayName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-2xl leading-none">×</button>
        </div>
        <div className="space-y-3 text-sm">
          <div className="fle items-start gap-2">
            <span className="text-slate-500 w-16 flex-shrink-0">When</span>
            <span className="text-slate-200">{timeLabel()}</span>
          </div>
          {event.location && (
            <div className="flex items-start gap-2">
              <span className="text-slate-500 w-16 flex-shrink-0">Where</span>
              <span className="text-slate-200">{event.location}</span>
            </div>
          )}
          {event.description && (
            <div className="flex items-start gap-2">
              <span className="text-slate-500 w-16 flex-shrink-0">Notes</span>
              <span className="text-slate-200 whitespace-pre-wrap">{event.description}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
