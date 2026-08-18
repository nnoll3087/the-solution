'use client';

import { useState } from 'react';
import { StarRating } from './StarRating';
import { JoinedMealPlanEntry, MEAL_TYPE_LABELS } from '@/lib/mealTypes';

export function MealRatingPopup({
  meal,
  onClose,
  onRated,
}: {
  meal: JoinedMealPlanEntry | null;
  onClose: () => void;
  onRated: (recipeId: string, patch: { kidsRating?: number; parentsRating?: number }) => void;
}) {
  const [saving, setSaving] = useState(false);

  if (!meal) return null;

  async function rate(field: 'kidsRating' | 'parentsRating', value: number) {
    if (!meal) return;
    onRated(meal.recipeId, { [field]: value });
    setSaving(true);
    await fetch('/api/recipes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: meal.recipeId, [field]: value }),
    }).catch(() => {});
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface-elevated rounded-xl border border-border-themed max-w-sm w-full p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl flex-shrink-0">{meal.emoji}</span>
            <div className="min-w-0">
              <div className="text-text font-semibold truncate">{meal.title}</div>
              <div className="text-xs text-text-subtle">{MEAL_TYPE_LABELS[meal.mealType]}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text text-2xl leading-none flex-shrink-0">×</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs uppercase tracking-wide text-text-muted mb-1">Kids rating</label>
            <StarRating value={meal.kidsRating || 0} onChange={(v) => rate('kidsRating', v)} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-text-muted mb-1">Parents rating</label>
            <StarRating value={meal.parentsRating || 0} onChange={(v) => rate('parentsRating', v)} />
          </div>
        </div>

        <a
          href={'/meals/recipes?edit=' + meal.recipeId}
          className="mt-5 block text-center text-xs text-accent hover:brightness-125"
        >
          Edit notes, photo, and more →
        </a>

        {saving && <p className="text-xs text-text-subtle text-center mt-1">Saving...</p>}
      </div>
    </div>
  );
}
