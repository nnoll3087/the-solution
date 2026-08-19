'use client';

import { useEffect, useState } from 'react';
import imageCompression from 'browser-image-compression';
import { suggestEmoji } from '@/lib/mealEmoji';
import { MEAL_TYPES, MEAL_TYPE_LABELS, MealType } from '@/lib/mealTypes';
import { StarRating } from './StarRating';
import { EmptyState } from './EmptyState';
import { MealCreateFlow, MealCreatePayload } from './MealCreateFlow';

type Recipe = {
  id: string;
  title: string;
  emoji: string;
  mealTypes: MealType[];
  notes?: string;
  url?: string;
  sourceLabel?: string;
  photoUrl?: string;
  kidsRating?: number;
  parentsRating?: number;
};

type FormState = {
  title: string;
  emoji: string;
  emojiTouched: boolean;
  mealTypes: MealType[];
  notes: string;
  url: string;
  sourceLabel: string;
  photoUrl: string;
  kidsRating: number;
  parentsRating: number;
};

const EMPTY_FORM: FormState = {
  title: '',
  emoji: '🍽️',
  emojiTouched: false,
  mealTypes: [],
  notes: '',
  url: '',
  sourceLabel: '',
  photoUrl: '',
  kidsRating: 0,
  parentsRating: 0,
};

const inputCls = 'w-full bg-bg/50 border border-border-themed rounded-md px-3 py-2 text-text text-base sm:text-sm';
const labelCls = 'block text-xs uppercase tracking-wide text-text-muted mb-1';

export function RecipeLibrary({ initialRecipes }: { initialRecipes: Recipe[] }) {
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function load(q?: string) {
    const url = q ? '/api/recipes?q=' + encodeURIComponent(q) : '/api/recipes';
    fetch(url)
      .then((r) => r.json())
      .then((data) => setRecipes(data.recipes || []))
      .catch(() => {});
  }

  useEffect(() => {
    const t = setTimeout(() => load(query || undefined), 250);
    return () => clearTimeout(t);
  }, [query]);

  // Deep link from the meal planner: /meals/recipes?edit=<id> opens straight
  // to that meal's edit form, so rating/notes/photo are one tap away instead
  // of requiring a manual search here.
  useEffect(() => {
    const editId = new URLSearchParams(window.location.search).get('edit');
    if (!editId) return;
    const target = initialRecipes.find((r) => r.id === editId);
    if (target) openEditForm(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleQuickCreate(payload: MealCreatePayload) {
    const res = await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save meal');
    setAddOpen(false);
    load(query || undefined);
  }

  function openEditForm(recipe: Recipe) {
    setEditingId(recipe.id);
    setForm({
      title: recipe.title,
      emoji: recipe.emoji,
      emojiTouched: true,
      mealTypes: recipe.mealTypes || [],
      notes: recipe.notes || '',
      url: recipe.url || '',
      sourceLabel: recipe.sourceLabel || '',
      photoUrl: recipe.photoUrl || '',
      kidsRating: recipe.kidsRating || 0,
      parentsRating: recipe.parentsRating || 0,
    });
    setError(null);
    setFormOpen(true);
  }

  function toggleMealType(mt: MealType) {
    setForm((f) => ({
      ...f,
      mealTypes: f.mealTypes.includes(mt) ? f.mealTypes.filter((x) => x !== mt) : [...f.mealTypes, mt],
    }));
  }

  async function handlePhotoChange(file: File | undefined) {
    if (!file) return;
    setUploadingPhoto(true);
    setError(null);
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 2000, useWebWorker: true });
      const uploadForm = new FormData();
      uploadForm.append('file', new File([compressed], file.name, { type: compressed.type }));
      const res = await fetch('/api/recipes/photo', { method: 'POST', body: uploadForm });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Photo upload failed');
      setForm((f) => ({ ...f, photoUrl: data.url }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Photo upload failed');
    } finally {
      setUploadingPhoto(false);
    }
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
  }

  function setTitle(title: string) {
    setForm((f) => ({ ...f, title, emoji: f.emojiTouched ? f.emoji : suggestEmoji(title) }));
  }

  function setEmoji(emoji: string) {
    setForm((f) => ({ ...f, emoji, emojiTouched: true }));
  }

  async function submit() {
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }
    if (form.mealTypes.length === 0) {
      setError('Pick at least one meal type');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      title: form.title.trim(),
      emoji: form.emoji.trim() || suggestEmoji(form.title),
      mealTypes: form.mealTypes,
      notes: form.notes.trim() || undefined,
      url: form.url.trim() || undefined,
      sourceLabel: form.sourceLabel.trim() || undefined,
      photoUrl: form.photoUrl || undefined,
      kidsRating: form.kidsRating || undefined,
      parentsRating: form.parentsRating || undefined,
    };
    try {
      const res = await fetch('/api/recipes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save recipe');
      closeForm();
      load(query || undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save recipe');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setConfirmDeleteId(null);
    setRecipes((prev) => prev.filter((r) => r.id !== id));
    await fetch('/api/recipes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {});
    load(query || undefined);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search meals..."
          className={inputCls + ' flex-1 min-w-[160px]'}
        />
        <button
          onClick={() => setAddOpen(true)}
          className="px-4 py-2.5 min-h-[44px] rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition whitespace-nowrap"
        >
          + Add meal
        </button>
      </div>

      {addOpen && (
        <div className="bg-surface/80 backdrop-blur rounded-lg border border-border-themed p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text">New meal</h2>
            <button onClick={() => setAddOpen(false)} className="text-text-muted hover:text-text text-2xl leading-none">×</button>
          </div>
          <MealCreateFlow onCreate={handleQuickCreate} submitLabel="Add meal" />
        </div>
      )}

      {formOpen && (
        <div className="bg-surface/80 backdrop-blur rounded-lg border border-border-themed p-5 mb-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text">Edit meal</h2>
            <button onClick={closeForm} className="text-text-muted hover:text-text text-2xl leading-none">×</button>
          </div>

          {error && (
            <div className="bg-danger-themed/20 border border-danger-themed/40 rounded-md px-3 py-2 text-sm text-danger-themed">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <div className="w-20">
              <label className={labelCls}>Emoji</label>
              <input
                type="text"
                value={form.emoji}
                onChange={(e) => setEmoji(e.target.value)}
                className={inputCls + ' text-center text-xl'}
                maxLength={4}
              />
            </div>
            <div className="flex-1">
              <label className={labelCls}>Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Taco night"
                className={inputCls}
                autoFocus
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
                    (form.mealTypes.includes(mt)
                      ? 'bg-accent text-white border-accent'
                      : 'bg-bg/50 text-text-muted border-border-themed hover:text-text')
                  }
                >
                  {MEAL_TYPE_LABELS[mt]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-6">
            <div>
              <label className={labelCls}>Kids rating</label>
              <StarRating value={form.kidsRating} onChange={(v) => setForm((f) => ({ ...f, kidsRating: v }))} />
            </div>
            <div>
              <label className={labelCls}>Parents rating</label>
              <StarRating value={form.parentsRating} onChange={(v) => setForm((f) => ({ ...f, parentsRating: v }))} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Photo</label>
            {form.photoUrl ? (
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.photoUrl} alt="" className="w-12 h-12 rounded object-cover" />
                <button onClick={() => setForm((f) => ({ ...f, photoUrl: '' }))} className="text-xs text-text-subtle hover:text-text">Remove</button>
              </div>
            ) : (
              <label className={inputCls + ' inline-flex items-center justify-center cursor-pointer text-text-subtle w-32'}>
                {uploadingPhoto ? 'Uploading...' : '+ Add photo'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingPhoto}
                  onChange={(e) => handlePhotoChange(e.target.files?.[0])}
                />
              </label>
            )}
          </div>

          <div>
            <label className={labelCls}>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={6}
              className={inputCls + ' resize-none'}
              placeholder="Ingredients, prep steps, whatever — paste it in however you've got it"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>URL</label>
              <input
                type="text"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="Optional"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Source</label>
              <input
                type="text"
                value={form.sourceLabel}
                onChange={(e) => setForm((f) => ({ ...f, sourceLabel: e.target.value }))}
                placeholder="e.g. Mom's cookbook"
                className={inputCls}
              />
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <button onClick={closeForm} disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-surface hover:bg-bg text-text text-sm">
              Cancel
            </button>
            <button onClick={submit} disabled={saving || uploadingPhoto} className="flex-1 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50">
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      )}

      {recipes.length === 0 ? (
        <EmptyState
          icon="🍽️"
          message={query ? 'No meals match that search.' : 'No meals yet. Add your first one above.'}
        />
      ) : (
        <ul className="space-y-2">
          {recipes.map((recipe) => (
            <li
              key={recipe.id}
              className="flex items-center gap-3 bg-bg/25 rounded-lg px-4 py-3 border border-border-themed"
            >
              {recipe.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={recipe.photoUrl} alt="" className="w-9 h-9 rounded object-cover flex-shrink-0" />
              ) : (
                <span className="text-2xl flex-shrink-0">{recipe.emoji}</span>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-text font-medium truncate">{recipe.title}</div>
                {recipe.notes && <div className="text-xs text-text-subtle truncate">{recipe.notes}</div>}
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {(recipe.mealTypes || []).map((mt) => (
                    <span key={mt} className="text-[10px] uppercase tracking-wide text-text-muted bg-surface px-1.5 py-0.5 rounded">
                      {MEAL_TYPE_LABELS[mt]}
                    </span>
                  ))}
                  {recipe.url && <span className="text-xs text-text-muted">🔗 link</span>}
                  {!!recipe.kidsRating && (
                    <div className="flex items-center gap-1 text-xs text-text-muted">🧒 <StarRating value={recipe.kidsRating} size="sm" /></div>
                  )}
                  {!!recipe.parentsRating && (
                    <div className="flex items-center gap-1 text-xs text-text-muted">🧑 <StarRating value={recipe.parentsRating} size="sm" /></div>
                  )}
                </div>
              </div>
              {confirmDeleteId === recipe.id ? (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => handleDelete(recipe.id)} className="px-2.5 py-1.5 rounded-md bg-danger-themed text-white text-xs font-semibold">
                    Delete
                  </button>
                  <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-text-muted">Cancel</button>
                </div>
              ) : (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEditForm(recipe)}
                    className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-surface-elevated text-text-muted hover:text-text transition"
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(recipe.id)}
                    className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-surface-elevated text-text-muted hover:text-text transition"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
