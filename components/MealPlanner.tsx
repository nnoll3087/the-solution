'use client';

import { useMemo, useState } from 'react';
import { toDateKey, parseLocalDate, startOfWeek } from '@/lib/dates';

type Recipe = {
  id: string;
  title: string;
  emoji: string;
  notes?: string;
};

type MealPlanEntry = { recipeId: string; notes?: string };
type MealPlan = Record<string, MealPlanEntry>;

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function MealPlanner({ initialRecipes, initialPlan }: { initialRecipes: Recipe[]; initialPlan: MealPlan }) {
  const [recipes] = useState<Recipe[]>(initialRecipes);
  const [plan, setPlan] = useState<MealPlan>(initialPlan);
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()));
  const [pickerDate, setPickerDate] = useState<string | null>(null);
  const [pickerQuery, setPickerQuery] = useState('');

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(anchor);
      d.setDate(anchor.getDate() + i);
      return d;
    });
  }, [anchor]);

  const recipesById = useMemo(() => {
    const map: Record<string, Recipe> = {};
    for (const r of recipes) map[r.id] = r;
    return map;
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    const q = pickerQuery.toLowerCase().trim();
    if (!q) return recipes;
    return recipes.filter((r) => r.title.toLowerCase().includes(q));
  }, [recipes, pickerQuery]);

  function goPrevWeek() {
    const d = new Date(anchor);
    d.setDate(d.getDate() - 7);
    setAnchor(d);
  }
  function goNextWeek() {
    const d = new Date(anchor);
    d.setDate(d.getDate() + 7);
    setAnchor(d);
  }
  function goThisWeek() {
    setAnchor(startOfWeek(new Date()));
  }

  function openPicker(dateKey: string) {
    setPickerQuery('');
    setPickerDate(dateKey);
  }
  function closePicker() {
    setPickerDate(null);
  }

  async function assignRecipe(recipeId: string) {
    if (!pickerDate) return;
    const date = pickerDate;
    setPlan((prev) => ({ ...prev, [date]: { recipeId } }));
    closePicker();
    await fetch('/api/meal-plan', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, recipeId }),
    }).catch(() => {});
  }

  async function clearDay(dateKey: string) {
    setPlan((prev) => {
      const next = { ...prev };
      delete next[dateKey];
      return next;
    });
    await fetch('/api/meal-plan', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: dateKey }),
    }).catch(() => {});
  }

  const weekLabel = (() => {
    const start = days[0];
    const end = days[6];
    const sm = start.toLocaleString('default', { month: 'short', day: 'numeric' });
    const em = end.toLocaleString('default', { month: 'short', day: 'numeric' });
    return sm + ' – ' + em + ', ' + end.getFullYear();
  })();

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
          const entry = plan[dateKey];
          const recipe = entry ? recipesById[entry.recipeId] : undefined;
          const isToday = dateKey === toDateKey(new Date());

          return (
            <div
              key={dateKey}
              className={
                'flex items-center gap-3 bg-bg/25 rounded-lg px-4 py-3 border ' +
                (isToday ? 'border-accent' : 'border-border-themed')
              }
            >
              <div className="w-24 flex-shrink-0">
                <div className="text-xs uppercase tracking-wide text-text-subtle">{DAY_LABELS[d.getDay()].slice(0, 3)}</div>
                <div className={'text-sm font-medium ' + (isToday ? 'text-accent' : 'text-text-muted')}>
                  {d.toLocaleString('default', { month: 'short', day: 'numeric' })}
                </div>
              </div>

              {recipe ? (
                <>
                  <span className="text-2xl flex-shrink-0">{recipe.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-text font-medium truncate">{recipe.title}</div>
                  </div>
                  <button
                    onClick={() => openPicker(dateKey)}
                    className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-surface-elevated text-text-muted hover:text-text transition"
                    title="Change"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => clearDay(dateKey)}
                    className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-surface-elevated text-text-muted hover:text-text transition"
                    title="Remove"
                  >
                    🗑️
                  </button>
                </>
              ) : (
                <button
                  onClick={() => openPicker(dateKey)}
                  className="flex-1 text-left text-text-subtle hover:text-text text-sm transition"
                >
                  + Add meal
                </button>
              )}
            </div>
          );
        })}
      </div>

      {pickerDate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={closePicker}
        >
          <div
            className="bg-surface-elevated rounded-xl border border-border-themed max-w-md w-full p-6 shadow-2xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-semibold text-text">
                {DAY_LABELS[parseLocalDate(pickerDate).getDay()]}, {parseLocalDate(pickerDate).toLocaleString('default', { month: 'short', day: 'numeric' })}
              </h2>
              <button onClick={closePicker} className="text-text-muted hover:text-text text-2xl leading-none">×</button>
            </div>

            <input
              type="text"
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
              placeholder="Search recipes..."
              autoFocus
              className="w-full bg-bg/50 border border-border-themed rounded-md px-3 py-2 text-text text-sm mb-3"
            />

            <div className="overflow-y-auto space-y-1.5">
              {filteredRecipes.length === 0 ? (
                <p className="text-sm text-text-subtle py-4 text-center">
                  No recipes match. Add one in the{' '}
                  <a href="/meals/recipes" className="text-accent hover:brightness-125">Recipe Library</a>.
                </p>
              ) : (
                filteredRecipes.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => assignRecipe(r.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface text-left transition"
                  >
                    <span className="text-xl flex-shrink-0">{r.emoji}</span>
                    <span className="text-text text-sm font-medium truncate">{r.title}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
