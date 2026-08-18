import { readStore, writeStore } from './storage';
import { getMealPlan } from './mealPlan';
import { getRecipesByIds } from './recipes';
import { toDateKey } from './dates';

export type ExtraItem = { id: string; text: string; checked: boolean };
type WeekState = { checkedIngredients: string[]; extraItems: ExtraItem[] };
type ShoppingListStore = Record<string, WeekState>;

const DEFAULT_STORE: ShoppingListStore = {};
const EMPTY_WEEK: WeekState = { checkedIngredients: [], extraItems: [] };

export type AggregatedIngredient = {
  id: string;
  name: string;
  detail: string;
  checked: boolean;
};

function weekDateKeys(weekStart: string): string[] {
  const [y, m, d] = weekStart.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(start);
    dd.setDate(start.getDate() + i);
    return toDateKey(dd);
  });
}

async function getWeekState(weekStart: string): Promise<WeekState> {
  const store = await readStore('shopping-list', DEFAULT_STORE);
  return store[weekStart] ?? EMPTY_WEEK;
}

async function saveWeekState(weekStart: string, state: WeekState): Promise<void> {
  const store = await readStore('shopping-list', DEFAULT_STORE);
  store[weekStart] = state;
  await writeStore('shopping-list', store);
}

export async function getShoppingList(
  weekStart: string
): Promise<{ ingredients: AggregatedIngredient[]; extraItems: ExtraItem[] }> {
  const [plan, state] = await Promise.all([getMealPlan(), getWeekState(weekStart)]);

  const dates = weekDateKeys(weekStart);
  const recipeIds = Array.from(new Set(dates.map((d) => plan[d]?.recipeId).filter((id): id is string => !!id)));
  const recipes = await getRecipesByIds(recipeIds);

  const groups = new Map<string, { name: string; parts: string[] }>();
  for (const date of dates) {
    const entry = plan[date];
    const recipe = entry && recipes[entry.recipeId];
    if (!recipe?.ingredients) continue;
    for (const ing of recipe.ingredients) {
      const key = ing.name.trim().toLowerCase();
      if (!key) continue;
      const qty = [ing.quantity, ing.unit].filter(Boolean).join(' ').trim();
      const part = qty ? qty + ' — ' + recipe.title : recipe.title;
      const group = groups.get(key);
      if (group) group.parts.push(part);
      else groups.set(key, { name: ing.name.trim(), parts: [part] });
    }
  }

  const ingredients: AggregatedIngredient[] = Array.from(groups.entries())
    .map(([key, g]) => ({
      id: key,
      name: g.name,
      detail: g.parts.join(', '),
      checked: state.checkedIngredients.includes(key),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { ingredients, extraItems: state.extraItems };
}

export async function setIngredientChecked(weekStart: string, ingredientId: string, checked: boolean): Promise<void> {
  const state = await getWeekState(weekStart);
  const set = new Set(state.checkedIngredients);
  if (checked) set.add(ingredientId);
  else set.delete(ingredientId);
  await saveWeekState(weekStart, { ...state, checkedIngredients: Array.from(set) });
}

export async function addExtraItem(weekStart: string, text: string): Promise<ExtraItem> {
  const state = await getWeekState(weekStart);
  const item: ExtraItem = { id: crypto.randomUUID(), text, checked: false };
  await saveWeekState(weekStart, { ...state, extraItems: [...state.extraItems, item] });
  return item;
}

export async function setExtraItemChecked(weekStart: string, id: string, checked: boolean): Promise<void> {
  const state = await getWeekState(weekStart);
  await saveWeekState(weekStart, {
    ...state,
    extraItems: state.extraItems.map((i) => (i.id === id ? { ...i, checked } : i)),
  });
}

export async function removeExtraItem(weekStart: string, id: string): Promise<void> {
  const state = await getWeekState(weekStart);
  await saveWeekState(weekStart, { ...state, extraItems: state.extraItems.filter((i) => i.id !== id) });
}
