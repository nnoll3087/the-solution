'use client';

import { useEffect, useState } from 'react';
import { NormalizedEvent } from '@/lib/events';

type CalendarOption = {
  accountEmail: string;
  calendarId: string;
  displayName: string;
  color: string;
};

type Reminder = {
  method: 'email' | 'popup';
  minutes: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  initialStart?: Date;
  initialCalendarKey?: string;
  existingEvent?: NormalizedEvent | null;
};

const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'RRULE:FREQ=DAILY', label: 'Daily' },
  { value: 'RRULE:FREQ=WEEKLY', label: 'Weekly' },
  { value: 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', label: 'Weekdays (Mon-Fri)' },
  { value: 'RRULE:FREQ=MONTHLY', label: 'Monthly' },
  { value: 'RRULE:FREQ=YEARLY', label: 'Yearly' },
];

const REMINDER_PRESETS = [
  { minutes: 0, label: 'At time of event' },
  { minutes: 10, label: '10 minutes before' },
  { minutes: 30, label: '30 minutes before' },
  { minutes: 60, label: '1 hour before' },
  { minutes: 1440, label: '1 day before' },
  { minutes: 10080, label: '1 week before' },
];

function nextRoundedHour(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

function toDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function toTimeInput(d: Date): string {
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

export function EventFormPanel({ open, onClose, onSaved, initialStart, initialCalendarKey, existingEvent }: Props) {
  const isEdit = !!existingEvent;

  const [calendars, setCalendars] = useState<CalendarOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [calendarKey, setCalendarKey] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [attendees, setAttendees] = useState('');
  const [recurrence, setRecurrence] = useState('none');
  const [reminders, setReminders] = useState<Reminder[]>([{ method: 'popup', minutes: 10 }]);

  useEffect(() => {
    if (!open) return;
    fetch('/api/calendars/list')
      .then((r) => r.json())
      .then((data) => setCalendars(data.calendars || []));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setError(null);

    if (existingEvent) {
      const s = new Date(existingEvent.start);
      const e = new Date(existingEvent.end);
      setTitle(existingEvent.title);
      setDescription(existingEvent.description || '');
      setLocation(existingEvent.location || '');
      setAllDay(existingEvent.allDay);
      setStartDate(toDateInput(s));
      setStartTime(toTimeInput(s));
      setEndDate(toDateInput(e));
      setEndTime(toTimeInput(e));
      setCalendarKey(existingEvent.accountEmail + '::' + existingEvent.calendarId);
    } else {
      const startBase = initialStart || nextRoundedHour();
      const endBase = new Date(startBase.getTime() + 60 * 60 * 1000);
      setTitle('');
      setDescription('');
      setLocation('');
      setAllDay(false);
      setStartDate(toDateInput(startBase));
      setStartTime(toTimeInput(startBase));
      setEndDate(toDateInput(endBase));
      setEndTime(toTimeInput(endBase));
      setAttendees('');
      setRecurrence('none');
      setReminders([{ method: 'popup', minutes: 10 }]);
      if (initialCalendarKey) setCalendarKey(initialCalendarKey);
    }
  }, [open, initialStart, initialCalendarKey, existingEvent]);

  useEffect(() => {
    if (!calendarKey && calendars.length > 0) {
      setCalendarKey(calendars[0].accountEmail + '::' + calendars[0].calendarId);
    }
  }, [calendars, calendarKey]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  async function submit() {
    setError(null);
    if (!title.trim()) { setError('Title is required'); return; }
    if (!calendarKey) { setError('Choose a calendar'); return; }

    const [accountEmail, calendarId] = calendarKey.split('::');

    const start = allDay
      ? new Date(startDate + 'T00:00:00').toISOString()
      : new Date(startDate + 'T' + startTime).toISOString();
    const end = allDay
      ? new Date(endDate + 'T00:00:00').toISOString()
      : new Date(endDate + 'T' + endTime).toISOString();

    if (new Date(end).getTime() <= new Date(start).getTime()) {
      setError('End time must be after start time');
      return;
    }

    const attendeeEmails = attendees.split(/[\s,;]+/).filter(Boolean);

    setSaving(true);
    try {
      if (isEdit && existingEvent) {
        const res = await fetch('/api/events/manage', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountEmail: existingEvent.accountEmail,
            calendarId: existingEvent.calendarId,
            eventId: existingEvent.id,
            title: title.trim(),
            description: description.trim(),
            location: location.trim(),
            start,
            end,
            allDay,
            attendees: attendeeEmails,
            recurrence,
            reminders,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update event');
      } else {
        const res = await fetch('/api/events/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountEmail,
            calendarId,
            title: title.trim(),
            description: description.trim() || undefined,
            location: location.trim() || undefined,
            start,
            end,
            allDay,
            attendees: attendeeEmails,
            recurrence,
            reminders,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create event');
      }
      onClose();
      onSaved?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  function addReminder() {
    setReminders([...reminders, { method: 'popup', minutes: 10 }]);
  }

  function updateReminder(idx: number, patch: Partial<Reminder>) {
    setReminders(reminders.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function removeReminder(idx: number) {
    setReminders(reminders.filter((_, i) => i !== idx));
  }

  if (!open) return null;

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/60 z-40" />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-slate-900 border-l border-slate-800 z-50 overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-100">{isEdit ? 'Edit event' : 'New event'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-2xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="bg-rose-950 border border-rose-800 rounded-md px-3 py-2 text-sm text-rose-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1">Calendar</label>
            <select value={calendarKey} onChange={(e) => setCalendarKey(e.target.value)} disabled={isEdit} className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-slate-100 text-sm disabled:opacity-60">
              {calendars.map((c) => (
                <option key={c.accountEmail + '::' + c.calendarId} value={c.accountEmail + '::' + c.calendarId}>
                  {c.displayName}
                </option>
              ))}
            </select>
            {isEdit && (
              <p className="text-xs text-slate-500 mt-1">Calendar can&apos;t be changed on existing events.</p>
            )}
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-slate-100 text-sm" placeholder="What's happening?" />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="allDay" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="w-4 h-4 accent-blue-500" />
            <label htmlFor="allDay" className="text-sm text-slate-300">All day</label>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1">Starts</label>
            <div className="flex gap-2">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="flex-1 bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-slate-100 text-sm" />
              {!allDay && (
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-32 bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-slate-100 text-sm" />
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1">Ends</label>
            <div className="flex gap-2">
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="flex-1 bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-slate-100 text-sm" />
              {!allDay && (
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-32 bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-slate-100 text-sm" />
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1">Location</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-slate-100 text-sm" placeholder="Optional" />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-slate-100 text-sm resize-none" placeholder="Optional" />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1">Attendees</label>
            <input type="text" value={attendees} onChange={(e) => setAttendees(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-slate-100 text-sm" placeholder="Comma-separated emails" />
            <p className="text-xs text-slate-500 mt-1">Attendees will receive an email invite.</p>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1">Recurrence</label>
            <select value={recurrence} onChange={(e) => setRecurrence(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-slate-100 text-sm">
              {RECURRENCE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs uppercase tracking-wide text-slate-400">Reminders</label>
              <button onClick={addReminder} className="text-xs text-blue-400 hover:text-blue-300">+ Add</button>
            </div>
            <div className="space-y-2">
              {reminders.map((r, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select value={r.method} onChange={(e) => updateReminder(i, { method: e.target.value as 'email' | 'popup' })} className="bg-slate-950 border border-slate-800 rounded-md px-2 py-1.5 text-slate-100 text-sm">
                    <option value="popup">Notification</option>
                    <option value="email">Email</option>
                  </select>
                  <select value={r.minutes} onChange={(e) => updateReminder(i, { minutes: parseInt(e.target.value) })} className="flex-1 bg-slate-950 border border-slate-800 rounded-md px-2 py-1.5 text-slate-100 text-sm">
                    {REMINDER_PRESETS.map((p) => (
                      <option key={p.minutes} value={p.minutes}>{p.label}</option>
                    ))}
                  </select>
                  <button onClick={() => removeReminder(i)} className="text-slate-500 hover:text-slate-300 text-sm px-1">×</button>
                </div>
              ))}
              {reminders.length === 0 && (
                <p className="text-xs text-slate-500">No reminders. Default will be used.</p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex gap-2">
            <button onClick={onClose} disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm">
              Cancel
            </button>
            <button onClick={submit} disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50">
              {saving ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save changes' : 'Create event')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}