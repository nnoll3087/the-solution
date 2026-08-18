'use client';

import { useCallback, useState } from 'react';
import { toDateKey, startOfWeek } from '@/lib/dates';
import { EmptyState } from './EmptyState';

type AggregatedIngredient = { id: string; name: string; detail: string; checked: boolean };
type ExtraItem = { id: string; text: string; checked: boolean };

export function ShoppingList({
  initialWeekStart,
  initialIngredients,
  initialExtraItems,
}: {
  initialWeekStart: string;
  initialIngredients: AggregatedIngredient[];
  initialExtraItems: ExtraItem[];
}) {
  const [weekStart, setWeekStart] = useState(initialWeekStart);
  const [ingredients, setIngredients] = useState<AggregatedIngredient[]>(initialIngredients);
  const [extraItems, setExtraItems] = useState<ExtraItem[]>(initialExtraItems);
  const [newItemText, setNewItemText] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback((week: string) => {
    setLoading(true);
    fetch('/api/shopping-list?week=' + week)
      .then((r) => r.json())
      .then((data) => {
        setIngredients(data.ingredients || []);
        setExtraItems(data.extraItems || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function changeWeek(next: string) {
    setWeekStart(next);
    load(next);
  }

  function goPrevWeek() {
    const d = new Date(weekStart + 'T00:00:00');
    d.setDate(d.getDate() - 7);
    changeWeek(toDateKey(d));
  }
  function goNextWeek() {
    const d = new Date(weekStart + 'T00:00:00');
    d.setDate(d.getDate() + 7);
    changeWeek(toDateKey(d));
  }
  function goThisWeek() {
    changeWeek(toDateKey(startOfWeek(new Date())));
  }

  async function toggleIngredient(id: string, checked: boolean) {
    setIngredients((prev) => prev.map((i) => (i.id === id ? { ...i, checked } : i)));
    await fetch('/api/shopping-list', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week: weekStart, type: 'ingredient', id, checked }),
    }).catch(() => {});
  }

  async function toggleExtra(id: string, checked: boolean) {
    setExtraItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked } : i)));
    await fetch('/api/shopping-list', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week: weekStart, type: 'extra', id, checked }),
    }).catch(() => {});
  }

  async function addItem() {
    const text = newItemText.trim();
    if (!text) return;
    setNewItemText('');
    const res = await fetch('/api/shopping-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week: weekStart, text }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (data?.item) setExtraItems((prev) => [...prev, data.item]);
  }

  async function removeItem(id: string) {
    setExtraItems((prev) => prev.filter((i) => i.id !== id));
    await fetch('/api/shopping-list', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week: weekStart, id }),
    }).catch(() => {});
  }

  const weekLabel = (() => {
    const start = new Date(weekStart + 'T00:00:00');
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const sm = start.toLocaleString('default', { month: 'short', day: 'numeric' });
    const em = end.toLocaleString('default', { month: 'short', day: 'numeric' });
    return sm + ' – ' + em + ', ' + end.getFullYear();
  })();

  const isEmpty = ingredients.length === 0 && extraItems.length === 0;

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

      {isEmpty && !loading ? (
        <EmptyState
          icon="🛒"
          message="Nothing planned for this week yet."
          action={
            <a href="/meals" className="text-accent hover:brightness-125 text-sm">
              Assign some meals →
            </a>
          }
        />
      ) : (
        <ul className="space-y-1.5 mb-6">
          {ingredients.map((ing) => (
            <li
              key={ing.id}
              className="flex items-start gap-3 bg-bg/25 rounded-lg px-4 py-2.5 border border-border-themed"
            >
              <input
                type="checkbox"
                checked={ing.checked}
                onChange={(e) => toggleIngredient(ing.id, e.target.checked)}
                className="mt-1 w-5 h-5 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className={'text-text font-medium capitalize' + (ing.checked ? ' line-through opacity-50' : '')}>
                  {ing.name}
                </div>
                <div className={'text-xs text-text-subtle truncate' + (ing.checked ? ' line-through opacity-50' : '')}>
                  {ing.detail}
                </div>
              </div>
            </li>
          ))}
          {extraItems.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 bg-bg/25 rounded-lg px-4 py-2.5 border border-border-themed"
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => toggleExtra(item.id, e.target.checked)}
                className="w-5 h-5 flex-shrink-0"
              />
              <div className={'flex-1 min-w-0 text-text' + (item.checked ? ' line-through opacity-50' : '')}>
                {item.text}
              </div>
              <button
                onClick={() => removeItem(item.id)}
                className="text-text-subtle hover:text-text text-sm px-1 flex-shrink-0"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addItem();
          }}
          placeholder="Add an item..."
          className="flex-1 bg-bg/50 border border-border-themed rounded-md px-3 py-2 text-text text-sm"
        />
        <button
          onClick={addItem}
          className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition whitespace-nowrap"
        >
          + Add
        </button>
      </div>
    </div>
  );
}
