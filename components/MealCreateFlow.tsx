'use client';

import { useState } from 'react';
import imageCompression from 'browser-image-compression';
import { suggestEmoji } from '@/lib/mealEmoji';
import { MEAL_TYPES, MEAL_TYPE_LABELS, MealType } from '@/lib/mealTypes';

export type MealCreatePayload = {
  title: string;
  emoji: string;
  mealTypes: MealType[];
  notes?: string;
  url?: string;
  sourceLabel?: string;
  photoUrl?: string;
};

type Stage = 'landing' | 'link-input' | 'form';

const inputCls = 'w-full bg-bg/50 border border-border-themed rounded-md px-3 py-2 text-text text-base sm:text-sm';
const labelCls = 'block text-xs uppercase tracking-wide text-text-muted mb-1';

export function MealCreateFlow({
  defaultMealTypes = [],
  onCreate,
  submitLabel = 'Add meal',
}: {
  defaultMealTypes?: MealType[];
  onCreate: (payload: MealCreatePayload) => Promise<void>;
  submitLabel?: string;
}) {
  const [stage, setStage] = useState<Stage>('landing');
  const [scanning, setScanning] = useState<'link' | 'photo' | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [linkInput, setLinkInput] = useState('');

  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🍽️');
  const [emojiTouched, setEmojiTouched] = useState(false);
  const [mealTypes, setMealTypes] = useState<MealType[]>(defaultMealTypes);
  const [notes, setNotes] = useState('');
  const [url, setUrl] = useState('');
  const [sourceLabel, setSourceLabel] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function setTitleField(v: string) {
    setTitle(v);
    if (!emojiTouched) setEmoji(suggestEmoji(v));
  }

  function reset() {
    setStage('landing');
    setScanError(null);
    setLinkInput('');
    setTitle('');
    setEmoji('🍽️');
    setEmojiTouched(false);
    setMealTypes(defaultMealTypes);
    setNotes('');
    setUrl('');
    setSourceLabel('');
    setPhotoUrl('');
    setSaveError(null);
  }

  async function fetchLink() {
    const trimmed = linkInput.trim();
    if (!trimmed) return;
    setScanning('link');
    setScanError(null);
    try {
      const res = await fetch('/api/recipes/scrape-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not read that page');
      setTitle(data.title);
      setEmoji(data.emoji || suggestEmoji(data.title));
      setEmojiTouched(true);
      setNotes(data.notes || '');
      setUrl(trimmed);
      setSourceLabel(data.sourceLabel || '');
      setStage('form');
    } catch (e) {
      setScanError(e instanceof Error ? e.message : 'Could not read that page');
    } finally {
      setScanning(null);
    }
  }

  async function handlePhotoSelected(file: File | undefined) {
    if (!file) return;
    setScanning('photo');
    setScanError(null);
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 2000, useWebWorker: true });
      const form = new FormData();
      form.append('file', new File([compressed], file.name, { type: compressed.type }));
      const uploadRes = await fetch('/api/recipes/photo', { method: 'POST', body: form });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Photo upload failed');
      setPhotoUrl(uploadData.url);

      const scanRes = await fetch('/api/recipes/scrape-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl: uploadData.url }),
      });
      const scanData = await scanRes.json();
      if (!scanRes.ok) throw new Error(scanData.error || 'Could not read that photo');
      setTitle(scanData.title);
      setEmoji(scanData.emoji || suggestEmoji(scanData.title));
      setEmojiTouched(true);
      setNotes(scanData.notes || '');
      setStage('form');
    } catch (e) {
      setScanError(e instanceof Error ? e.message : 'Could not read that photo');
    } finally {
      setScanning(null);
    }
  }

  function toggleMealType(mt: MealType) {
    setMealTypes((prev) => (prev.includes(mt) ? prev.filter((x) => x !== mt) : [...prev, mt]));
  }

  async function submit() {
    if (!title.trim()) {
      setSaveError('Give it a name');
      return;
    }
    if (mealTypes.length === 0) {
      setSaveError('Pick at least one meal type');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await onCreate({
        title: title.trim(),
        emoji: emoji.trim() || suggestEmoji(title),
        mealTypes,
        notes: notes.trim() || undefined,
        url: url.trim() || undefined,
        sourceLabel: sourceLabel.trim() || undefined,
        photoUrl: photoUrl || undefined,
      });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save meal');
    } finally {
      setSaving(false);
    }
  }

  if (stage === 'landing') {
    return (
      <div className="space-y-3">
        {scanError && (
          <div className="bg-danger-themed/20 border border-danger-themed/40 rounded-md px-3 py-2 text-sm text-danger-themed">
            {scanError}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setStage('link-input')}
            disabled={!!scanning}
            className="flex flex-col items-center gap-1.5 px-4 py-5 rounded-lg bg-accent hover:bg-accent-hover text-white transition disabled:opacity-50"
          >
            <span className="text-2xl">🔗</span>
            <span className="text-sm font-medium">Paste a link</span>
          </button>
          <label className="flex flex-col items-center gap-1.5 px-4 py-5 rounded-lg bg-accent hover:bg-accent-hover text-white transition cursor-pointer disabled:opacity-50">
            <span className="text-2xl">📷</span>
            <span className="text-sm font-medium">{scanning === 'photo' ? 'Scanning...' : 'Scan a photo'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={!!scanning}
              onChange={(e) => handlePhotoSelected(e.target.files?.[0])}
            />
          </label>
        </div>
        <button
          onClick={() => setStage('form')}
          className="w-full text-center text-xs text-text-muted hover:text-text py-1"
        >
          or type it in manually
        </button>
      </div>
    );
  }

  if (stage === 'link-input') {
    return (
      <div className="space-y-3">
        <button onClick={() => { setStage('landing'); setScanError(null); }} className="text-xs text-text-muted hover:text-text">
          ‹ Back
        </button>
        {scanError && (
          <div className="bg-danger-themed/20 border border-danger-themed/40 rounded-md px-3 py-2 text-sm text-danger-themed">
            {scanError}
          </div>
        )}
        <div>
          <label className={labelCls}>Recipe URL</label>
          <input
            type="text"
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') fetchLink(); }}
            placeholder="https://..."
            className={inputCls}
            autoFocus
          />
        </div>
        <button
          onClick={fetchLink}
          disabled={scanning === 'link' || !linkInput.trim()}
          className="w-full px-4 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50"
        >
          {scanning === 'link' ? 'Fetching...' : 'Fetch'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={reset} className="text-xs text-text-muted hover:text-text">
        ‹ Start over
      </button>

      {saveError && (
        <div className="bg-danger-themed/20 border border-danger-themed/40 rounded-md px-3 py-2 text-sm text-danger-themed">
          {saveError}
        </div>
      )}

      {(sourceLabel || photoUrl) && (
        <div className="flex items-center gap-2 flex-wrap">
          {sourceLabel && (
            <span className="text-xs text-text-muted bg-surface px-2 py-1 rounded-full">🔗 {sourceLabel}</span>
          )}
          {photoUrl && (
            <span className="flex items-center gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt="" className="w-8 h-8 rounded object-cover" />
              <button onClick={() => setPhotoUrl('')} className="text-xs text-text-subtle hover:text-text">Remove photo</button>
            </span>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <div className="w-20">
          <label className={labelCls}>Emoji</label>
          <input
            type="text"
            value={emoji}
            onChange={(e) => { setEmoji(e.target.value); setEmojiTouched(true); }}
            className={inputCls + ' text-center text-xl'}
            maxLength={4}
          />
        </div>
        <div className="flex-1">
          <label className={labelCls}>What&apos;s the meal?</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitleField(e.target.value)}
            placeholder="Taco night"
            className={inputCls}
            autoFocus={stage === 'form' && !title}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>Meal type</label>
        <div className="flex flex-wrap gap-1.5">
          {MEAL_TYPES.map((mt) => (
            <button
              key={mt}
              type="button"
              onClick={() => toggleMealType(mt)}
              className={
                'px-3 py-1.5 rounded-full text-xs font-medium border transition ' +
                (mealTypes.includes(mt)
                  ? 'bg-accent text-white border-accent'
                  : 'bg-bg/50 text-text-muted border-border-themed hover:text-text')
              }
            >
              {MEAL_TYPE_LABELS[mt]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={6}
          className={inputCls + ' resize-none'}
          placeholder="Ingredients, prep steps, whatever — paste it in however you've got it"
        />
      </div>

      <button
        onClick={submit}
        disabled={saving}
        className="w-full px-4 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50"
      >
        {saving ? 'Saving...' : submitLabel}
      </button>
    </div>
  );
}
