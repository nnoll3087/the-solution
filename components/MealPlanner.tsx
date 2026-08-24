'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toDateKey, startOfWeek, parseLocalDate } from '@/lib/dates';
import { MEAL_TYPES, MEAL_TYPE_LABELS, MealType } from '@/lib/mealTypes';
import { MealSlotPicker, CreatePayload } from './MealSlotPicker';

const ANCHOR_STORAGE_KEY = 'solution-meal-planner-week';

type Recipe = {
  id: string;
  title: string;
  emoji: string;
  mealTypes: MealType[];
  kidsRating?: number;
  parentsRating?: number;
};

type JoinedEntry = { recipeId: string; mealType: MealType; title: string; emoji: string };
type MealPlan = Record<string, JoinedEntry>;

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const MEAL_TYPE_ICON: Record<MealType, string> = {
  breakfast: '🍳',
  lunch: '🥪',
  dinner: '🍽️',
  snack: '🍿',
};

function slotKey(date: string, mealType: MealType): string {
  return date + ':' + mealType;
}

export function MealPlanner({ initialRecipes, initialPlan }: { initialRecipes: Recipe[]; initialPlan: MealPlan }) {
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
  const [plan, setPlan] = useState<MealPlan>(initialPlan);
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()));
  const [slot, setSlot] = useState<{ date: string; mealType: MealType } | null>(null);

  // Full navigations to/from this tab (see MealsMenu) remount this component,
  // so without restoring the last-viewed week it always snaps back to "this
  // week" on return — making meals added for another week look like they
  // vanished, even though they saved fine. Restoring in an effect (rather
  // than the useState initializer) keeps the first client render matching
  // the server-rendered "this week" and avoids a hydration mismatch.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(ANCHOR_STORAGE_KEY);
      if (saved) {
        const parsed = parseLocalDate(saved);
        if (!isNaN(parsed.getTime())) setAnchor(startOfWeek(parsed));
      }
    } catch {}
  }, []);

  function persistAnchor(date: Date) {
    setAnchor(date);
    try {
      localStorage.setItem(ANCHOR_STORAGE_KEY, toDateKey(date));
    } catch {}
  }

  // The meal-plan store is a whole-document read-modify-write with no locking
  // (fine for normal sequential use), so two requests for the same slot fired
  // close together — e.g. remove then immediately re-add — can complete out
  // of order and silently overwrite each other. Queuing every /api/meal-plan
  // mutation through this ref forces them to run strictly one at a time, in
  // the order the user triggered them, so the last action always wins.
  const mealPlanQueueRef = useRef<Promise<void>>(Promise.resolve());

  function queueMealPlanMutation(request: () => Promise<Response>): Promise<void> {
    const run = mealPlanQueueRef.current.then(() => request().catch(() => {})).then(() => undefined);
    mealPlanQueueRef.current = run;
    return run;
  }

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(anchor);
      d.setDate(anchor.getDate() + i);
      return d;
    });
  }, [anchor]);

  function goPrevWeek() {
    const d = new Date(anchor);
    d.setDate(d.getDate() - 7);
    persistAnchor(d);
  }
  function goNextWeek() {
    const d = new Date(anchor);
    d.setDate(d.getDate() + 7);
    persistAnchor(d);
  }
  function goThisWeek() {
    persistAnchor(startOfWeek(new Date()));
  }

  function closeSlot() {
    setSlot(null);
  }

  async function assignExisting(recipeId: string) {
    if (!slot) return;
    const { date, mealType } = slot;
    const recipe = recipes.find((r) => r.id === recipeId);
    if (!recipe) return;
    setPlan((prev) => ({ ...prev, [slotKey(date, mealType)]: { recipeId, mealType, title: recipe.title, emoji: recipe.emoji } }));
    closeSlot();
    await queueMealPlanMutation(() =>
      fetch('/api/meal-plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, mealType, recipeId }),
      })
    );
  }

  async function createAndAssign(payload: CreatePayload) {
    if (!slot) return;
    const { date, mealType } = slot;
    const res = await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create meal');
    const recipe: Recipe = data.recipe;
    setRecipes((prev) => [...prev, recipe]);
    setPlan((prev) => ({
      ...prev,
      [slotKey(date, mealType)]: { recipeId: recipe.id, mealType, title: recipe.title, emoji: recipe.emoji },
    }));
    closeSlot();
    await queueMealPlanMutation(() =>
      fetch('/api/meal-plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, mealType, recipeId: recipe.id }),
      })
    );
  }

  async function removeSlot() {
    if (!slot) return;
    const { date, mealType } = slot;
    setPlan((prev) => {
      const next = { ...prev };
      delete next[slotKey(date, mealType)];
      return next;
    });
    closeSlot();
    await queueMealPlanMutation(() =>
      fetch('/api/meal-plan', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, mealType }),
      })
    );
  }

  const weekLabel = (() => {
    const start = days[0];
    const end = days[6];
    const sm = start.toLocaleString('default', { month: 'short', day: 'numeric' });
    const em = end.toLocaleString('default', { month: 'short', day: 'numeric' });
    return sm + ' – ' + em + ', ' + end.getFullYear();
  })();

  const activeSlotEntry = slot ? plan[slotKey(slot.date, slot.mealType)] : undefined;
  const activeRecipe = activeSlotEntry ? recipes.find((r) => r.id === activeSlotEntry.recipeId) : undefined;
  const activeDayLabel = slot
    ? DAY_LABELS[new Date(slot.date + 'T00:00:00').getDay()] +
      ', ' +
      new Date(slot.date + 'T00:00:00').toLocaleString('default', { month: 'short', day: 'numeric' })
    : '';

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <button
            onClick={goPrevWeek}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface hover:bg-surface-elevated border border-border-themed text-text transition"
          >
            ‹
          </button>
          <button
            onClick={goThisWeek}
            className="px-3 py-2 h-10 rounded-lg bg-surface hover:bg-surface-elevated border border-border-themed text-text text-sm font-medium transition"
          >
            This week
          </button>
          <button
            onClick={goNextWeek}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface hover:bg-surface-elevated border border-border-themed text-text transition"
          >
            ›
          </button>
        </div>
        <div className="text-text-muted text-sm font-medium">{weekLabel}</div>
      </div>

      <div className="space-y-2">
        {days.map((d) => {
          const dateKey = toDateKey(d);
          const isToday = dateKey === toDateKey(new Date());

          return (
            <div
              key={dateKey}
              className={
                'bg-bg/25 rounded-lg px-4 py-3 border ' + (isToday ? 'border-accent' : 'border-border-themed')
              }
            >
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-xs uppercase tracking-wide text-text-subtle">{DAY_LABELS[d.getDay()].slice(0, 3)}</span>
                <span className={'text-sm font-medium ' + (isToday ? 'text-accent' : 'text-text-muted')}>
                  {d.toLocaleString('default', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {MEAL_TYPES.map((mealType) => {
                  const entry = plan[slotKey(dateKey, mealType)];
                  return (
                    <button
                      key={mealType}
                      onClick={() => setSlot({ date: dateKey, mealType })}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded-md border border-border-themed bg-surface/40 hover:bg-surface text-left transition min-w-0"
                    >
                      {entry ? (
                        <>
                          <span className="text-base flex-shrink-0">{entry.emoji}</span>
                          <span className="text-xs text-text font-medium truncate">{entry.title}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-base flex-shrink-0 opacity-40">{MEAL_TYPE_ICON[mealType]}</span>
                          <span className="text-xs text-text-subtle truncate">{MEAL_TYPE_LABELS[mealType]}</span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {slot && (
        <MealSlotPicker
          dayLabel={activeDayLabel}
          mealType={slot.mealType}
          current={
            activeSlotEntry
              ? {
                  recipeId: activeSlotEntry.recipeId,
                  title: activeSlotEntry.title,
                  emoji: activeSlotEntry.emoji,
                  kidsRating: activeRecipe?.kidsRating,
                  parentsRating: activeRecipe?.parentsRating,
                }
              : undefined
          }
          recipes={recipes}
          onAssignExisting={assignExisting}
          onCreateAndAssign={createAndAssign}
          onRemove={removeSlot}
          onClose={closeSlot}
        />
      )}
    </div>
  );
}
