'use client';

import { useMemo, useState } from 'react';
import { suggestEmoji } from '@/lib/mealEmoji';
import { MealType, MEAL_TYPE_LABELS } from '@/lib/mealTypes';
import { MealCreateFlow, MealCreatePayload } from './MealCreateFlow';

type Recipe = {
  id: string;
  title: string;
  emoji: string;
  mealTypes: MealType[];
  kidsRating?: number;
  parentsRating?: number;
};

export type CreatePayload = MealCreatePayload;

type CurrentMeal = { recipeId: string; title: string; emoji: string; kidsRating?: number; parentsRating?: number };

type Props = {
  dayLabel: string;
  mealType: MealType;
  current?: CurrentMeal;
  recipes: Recipe[];
  onAssignExisting: (recipeId: string) => void;
  onCreateAndAssign: (payload: CreatePayload) => Promise<void>;
  onRemove: () => void;
  onClose: () => void;
};

const inputCls = 'w-full bg-bg/50 border border-border-themed rounded-md px-3 py-2 text-text text-base sm:text-sm';
const labelCls = 'block text-xs uppercase tracking-wide text-text-muted mb-1';

export function MealSlotPicker({
  dayLabel,
  mealType,
  current,
  recipes,
  onAssignExisting,
  onCreateAndAssign,
  onRemove,
  onClose,
}: Props) {
  const [query, setQuery] = useState('');
  // A filled slot opens straight to a compact summary (view/edit/remove) —
  // no keyboard, no form — instead of the full create/assign form. "Change"
  // reveals that form. Empty slots go straight to it since there's nothing
  // to summarize.
  const [changing, setChanging] = useState(!current);

  const existingList = useMemo(() => {
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      return recipes.filter((r) => r.title.toLowerCase().includes(q));
    }
    return recipes.filter((r) => r.mealTypes.includes(mealType));
  }, [recipes, query, mealType]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface-elevated rounded-xl border border-border-themed max-w-md w-full p-6 shadow-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 mb-3">
          <h2 className="text-lg font-semibold text-text">
            {MEAL_TYPE_LABELS[mealType]}, {dayLabel}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text text-2xl leading-none">×</button>
        </div>

        {current && !changing ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-bg/40 border border-border-themed">
              <span className="text-2xl flex-shrink-0">{current.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-text font-medium truncate">{current.title}</div>
                {(!!current.kidsRating || !!current.parentsRating) && (
                  <div className="text-xs text-text-muted mt-0.5">
                    {!!current.kidsRating && '🧒' + current.kidsRating}
                    {!!current.kidsRating && !!current.parentsRating && '  '}
                    {!!current.parentsRating && '🧑' + current.parentsRating}
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <a
                href={'/meals/recipes?edit=' + current.recipeId}
                className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg bg-surface hover:bg-bg text-text text-xs font-medium transition"
              >
                <span className="text-lg">✏️</span> Edit
              </a>
              <button
                onClick={() => setChanging(true)}
                className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg bg-surface hover:bg-bg text-text text-xs font-medium transition"
              >
                <span className="text-lg">🔁</span> Change
              </button>
              <button
                onClick={onRemove}
                className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg bg-surface hover:bg-bg text-danger-themed text-xs font-medium transition"
              >
                <span className="text-lg">🗑️</span> Remove
              </button>
            </div>
          </div>
        ) : (
        <div className="overflow-y-auto space-y-4 pr-1">
          {current && (
            <button onClick={() => setChanging(false)} className="text-xs text-text-muted hover:text-text -mt-1">
              ‹ Back to {current.emoji} {current.title}
            </button>
          )}

          <MealCreateFlow defaultMealTypes={[mealType]} onCreate={onCreateAndAssign} submitLabel="Add meal" />

          <div className="pt-2 border-t border-border-themed">
            <label className={labelCls}>Or choose one you&apos;ve made before</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search all meals..."
              className={inputCls + ' mb-2'}
            />
            <div className="space-y-1">
              {existingList.length === 0 ? (
                <p className="text-xs text-text-subtle py-2">
                  {query ? 'No meals match that search.' : 'No ' + MEAL_TYPE_LABELS[mealType].toLowerCase() + ' meals yet — search above for any meal, or add a new one.'}
                </p>
              ) : (
                existingList.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => onAssignExisting(r.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface text-left transition"
                  >
                    <span className="text-xl flex-shrink-0">{r.emoji || suggestEmoji(r.title)}</span>
                    <span className="text-text text-sm font-medium truncate flex-1">{r.title}</span>
                    {(!!r.kidsRating || !!r.parentsRating) && (
                      <span className="text-xs text-text-muted flex-shrink-0 whitespace-nowrap">
                        {!!r.kidsRating && '🧒' + r.kidsRating}
                        {!!r.kidsRating && !!r.parentsRating && ' '}
                        {!!r.parentsRating && '🧑' + r.parentsRating}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
