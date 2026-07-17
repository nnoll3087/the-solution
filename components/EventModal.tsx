'use client';

import { NormalizedEvent } from '@/lib/events';
import { parseLocalDate } from '@/lib/dates';
import { useEffect, useState } from 'react';

type Props = {
  event: NormalizedEvent | null;
  onClose: () => void;
  onEdit?: (event: NormalizedEvent) => void;
  onDeleted?: () => void;
};

export function EventModal({ event, onClose, onEdit, onDeleted }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (!event) {
      setConfirmDelete(false);
      setError(null);
    }
  }, [event]);

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
    if (event!.allDay) {
      const s = parseLocalDate(event!.start);
      // Google's all-day end is exclusive; show the real last day
      const e = parseLocalDate(event!.end);
      e.setDate(e.getDate() - 1);
      if (s.toDateString() === e.toDateString()) return 'All day, ' + fmtDate(s);
      return 'All day, ' + fmtDate(s) + ' to ' + fmtDate(e);
    }
    const sameDay = start.toDateString() === end.toDateString();
    if (sameDay) return fmtDate(start) + ', ' + fmtTime(start) + ' to ' + fmtTime(end);
    return fmtDate(start) + ' ' + fmtTime(start) + ' to ' + fmtDate(end) + ' ' + fmtTime(end);
  }

  async function handleDelete() {
    if (!event) return;
    setError(null);
    setDeleting(true);
    try {
      const res = await fetch('/api/events/manage', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountEmail: event.accountEmail,
          calendarId: event.calendarId,
          eventId: event.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete event');
      onClose();
      onDeleted?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface-elevated rounded-xl border border-border-themed max-w-lg w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3 flex-1">
            <span className="w-4 h-4 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: event.color }} />
            <div>
              <h2 className="text-xl font-semibold text-text">{event.title}</h2>
              <p className="text-sm text-text-muted mt-0.5">{event.displayName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text text-2xl leading-none">×</button>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-text-subtle w-16 flex-shrink-0">When</span>
            <span className="text-text">{timeLabel()}</span>
          </div>
          {event.location && (
            <div className="flex items-start gap-2">
              <span className="text-text-subtle w-16 flex-shrink-0">Where</span>
              <span className="text-text">{event.location}</span>
            </div>
          )}
          {event.alsoFor && event.alsoFor.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-text-subtle w-16 flex-shrink-0">Also for</span>
              <span className="flex items-center gap-3 flex-wrap">
                {event.alsoFor.map((p) => (
                  <span key={p.displayName} className="inline-flex items-center gap-1.5 text-text">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: p.color }} />
                    {p.displayName}
                  </span>
                ))}
              </span>
            </div>
          )}
          {event.description && (
            <div className="flex items-start gap-2">
              <span className="text-text-subtle w-16 flex-shrink-0">Notes</span>
              <span className="text-text whitespace-pre-wrap">{event.description}</span>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 bg-danger-themed/20 border border-danger-themed/40 rounded-md px-3 py-2 text-sm text-danger-themed">
            {error}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-border-themed flex items-center justify-between gap-2">
          {!confirmDelete ? (
            <>
              <button
                onClick={() => setConfirmDelete(true)}
                className="px-3 py-2 rounded-lg bg-surface hover:bg-danger-themed/30 text-text-muted hover:text-danger-themed text-sm transition"
              >
                Delete
              </button>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-3 py-2 rounded-lg bg-surface hover:bg-surface-elevated text-text text-sm"
                >
                  Close
                </button>
                {onEdit && (
                  <button
                    onClick={() => onEdit(event)}
                    className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium"
                  >
                    Edit
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <span className="text-sm text-text">Delete this event?</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="px-3 py-2 rounded-lg bg-surface hover:bg-surface-elevated text-text text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg bg-danger-themed hover:brightness-110 text-white text-sm font-medium disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}