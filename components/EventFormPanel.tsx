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

// Date-string math ('YYYY-MM-DD') so all-day dates never pass through Date's UTC parsing
function addDaysToDateStr(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return toDateInput(new Date(y, m - 1, d + n));
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
  const [tags, setTags] = useState<string[]>([]);

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
      setTitle(existingEvent.title);
      setDescription(existingEvent.description || '');
      setLocation(existingEvent.location || '');
      setAllDay(existingEvent.allDay);
      if (existingEvent.allDay) {
        // Google stores all-day as bare dates with an exclusive end; show the inclusive last day
        setStartDate(existingEvent.start.slice(0, 10));
        setEndDate(addDaysToDateStr(existingEvent.end.slice(0, 10), -1));
        setStartTime('09:00');
        setEndTime('10:00');
      } else {
        const s = new Date(existingEvent.start);
        const e = new Date(existingEvent.end);
        setStartDate(toDateInput(s));
        setStartTime(toTimeInput(s));
        setEndDate(toDateInput(e));
        setEndTime(toTimeInput(e));
      }
      setCalendarKey(existingEvent.accountEmail + '::' + existingEvent.calendarId);
      setTags(existingEvent.tags || []);
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
      setTags([]);
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

    let start: string;
    let end: string;
    if (allDay) {
      if (endDate < startDate) {
        setError('End date must be on or after start date');
        return;
      }
      // Send bare dates; Google's all-day end date is exclusive, so add a day
      start = startDate;
      end = addDaysToDateStr(endDate, 1);
    } else {
      start = new Date(startDate + 'T' + startTime).toISOString();
      end = new Date(endDate + 'T' + endTime).toISOString();
      if (new Date(end).getTime() <= new Date(start).getTime()) {
        setError('End time must be after start time');
        return;
      }
    }

    const attendeeEmails = attendees.split(/[\s,;]+/).filter(Boolean);
    // The home calendar can't tag itself (relevant if it changed after chips were picked)
    const cleanTags = tags.filter((t) => t !== calendarKey);

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
        await saveTags(existingEvent.id, cleanTags);
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
        if (data.event?.id) await saveTags(data.event.id, cleanTags);
      }
      onClose();
      onSaved?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  async function saveTags(eventId: string, t: string[]) {
    await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, tags: t }),
    });
  }

  function toggleTag(key: string) {
    setTags((prev) => (prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]));
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

  const inputCls = 'w-full bg-bg/50 border border-border-themed rounded-md px-3 py-2 text-text text-sm';
  const labelCls = 'block text-xs uppercase tracking-wide text-text-muted mb-1';

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/60 z-40" />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-surface-elevated border-l border-border-themed z-50 overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-surface-elevated border-b border-border-themed px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-text">{isEdit ? 'Edit event' : 'New event'}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text text-2xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="bg-danger-themed/20 border border-danger-themed/40 rounded-md px-3 py-2 text-sm text-danger-themed">
              {error}
            </div>
          )}

          <div>
            <label className={labelCls}>Calendar</label>
            <select value={calendarKey} onChange={(e) => setCalendarKey(e.target.value)} disabled={isEdit} className={inputCls + ' disabled:opacity-60'}>
              {calendars.map((c) => (
                <option key={c.accountEmail + '::' + c.calendarId} value={c.accountEmail + '::' + c.calendarId}>
                  {c.displayName}
                </option>
              ))}
            </select>
            {isEdit && (
              <p className="text-xs text-text-subtle mt-1">Calendar can&apos;t be changed on existing events.</p>
            )}
          </div>

          <div>
            <label className={labelCls}>Also for</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => toggleTag('family')}
                className={
                  'px-2.5 py-1 rounded-full text-xs font-medium border transition ' +
                  (tags.includes('family')
                    ? 'bg-accent text-white border-accent'
                    : 'bg-bg text-text-muted border-border-themed hover:text-text')
                }
              >
                Family
              </button>
              {calendars
                .filter((c) => c.accountEmail + '::' + c.calendarId !== calendarKey)
                .map((c) => {
                  const key = c.accountEmail + '::' + c.calendarId;
                  const selected = tags.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleTag(key)}
                      className={
                        'px-2.5 py-1 rounded-full text-xs font-medium border transition ' +
                        (selected ? 'text-white' : 'bg-bg text-text-muted border-border-themed hover:text-text')
                      }
                      style={selected ? { backgroundColor: c.color, borderColor: c.color } : undefined}
                    >
                      {c.displayName}
                    </button>
                  );
                })}
            </div>
            <p className="text-xs text-text-subtle mt-1">Solution-only. Shows in their queue and as dots on the event. Not sent to Google.</p>
          </div>

          <div>
            <label className={labelCls}>Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="What's happening?" />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="allDay" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="w-4 h-4 accent-[var(--theme-accent)]" />
            <label htmlFor="allDay" className="text-sm text-text">All day</label>
          </div>

          <div>
            <label className={labelCls}>Starts</label>
            <div className="flex gap-2">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={'flex-1 ' + inputCls} />
              {!allDay && (
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={'w-32 ' + inputCls} />
              )}
            </div>
          </div>

          <div>
            <label className={labelCls}>Ends</label>
            <div className="flex gap-2">
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={'flex-1 ' + inputCls} />
              {!allDay && (
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={'w-32 ' + inputCls} />
              )}
            </div>
          </div>

          <div>
            <label className={labelCls}>Location</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} placeholder="Optional" />
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls + ' resize-none'} placeholder="Optional" />
          </div>

          <div>
            <label className={labelCls}>Attendees</label>
            <input type="text" value={attendees} onChange={(e) => setAttendees(e.target.value)} className={inputCls} placeholder="Comma-separated emails" />
            <p className="text-xs text-text-subtle mt-1">Attendees will receive an email invite.</p>
          </div>

          <div>
            <label className={labelCls}>Recurrence</label>
            <select value={recurrence} onChange={(e) => setRecurrence(e.target.value)} className={inputCls}>
              {RECURRENCE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelCls}>Reminders</label>
              <button onClick={addReminder} className="text-xs text-accent hover:brightness-125">+ Add</button>
            </div>
            <div className="space-y-2">
              {reminders.map((r, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select value={r.method} onChange={(e) => updateReminder(i, { method: e.target.value as 'email' | 'popup' })} className="bg-bg/50 border border-border-themed rounded-md px-2 py-1.5 text-text text-sm">
                    <option value="popup">Notification</option>
                    <option value="email">Email</option>
                  </select>
                  <select value={r.minutes} onChange={(e) => updateReminder(i, { minutes: parseInt(e.target.value) })} className="flex-1 bg-bg/50 border border-border-themed rounded-md px-2 py-1.5 text-text text-sm">
                    {REMINDER_PRESETS.map((p) => (
                      <option key={p.minutes} value={p.minutes}>{p.label}</option>
                    ))}
                  </select>
                  <button onClick={() => removeReminder(i)} className="text-text-subtle hover:text-text text-sm px-1">×</button>
                </div>
              ))}
              {reminders.length === 0 && (
                <p className="text-xs text-text-subtle">No reminders. Default will be used.</p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-border-themed flex gap-2">
            <button onClick={onClose} disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-surface hover:bg-bg text-text text-sm">
              Cancel
            </button>
            <button onClick={submit} disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50">
              {saving ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save changes' : 'Create event')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}