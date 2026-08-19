import { createHash } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { readStore, writeStore } from './storage';
import { getMealPlan, mealsForDate } from './mealPlan';
import { getRecipesByIds } from './recipes';
import { toDateKey } from './dates';
import { MEAL_TYPES } from './mealTypes';
import { recordGeneration } from './usage';

// Same client/model/usage-tracking pattern as /api/theme/generate and
// /api/meals/assistant — shopping-list spend counts against the same credit countdown.
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type ExtraItem = { id: string; text: string; checked: boolean };
export type AggregatedIngredient = {
  id: string;
  name: string;
  detail: string;
  checked: boolean;
};

type WeekState = {
  checkedIngredients: string[];
  extraItems: ExtraItem[];
  // Cached AI extraction, keyed to a hash of the meal notes it was built from —
  // regenerated only when that hash changes, so opening the page never re-runs the AI.
  aiHash?: string;
  aiItems?: { name: string; detail: string }[];
};

type ShoppingListStore = Record<string, WeekState>;

const DEFAULT_STORE: ShoppingListStore = {};
const EMPTY_WEEK: WeekState = { checkedIngredients: [], extraItems: [] };

const SYSTEM_PROMPT = `You build a consolidated grocery shopping list for a family meal planner called "The Solution®," from the freeform notes attached to a week's planned meals. Each meal's notes may contain an ingredient list, prep steps, pasted recipe text, or a mix — written however the person typed or pasted it.

Return ONLY valid JSON, no markdown fences, no explanation: an array of objects, each { "name": "item name", "detail": "short note - combined quantity and/or which meals need it" }.

Rules:
- Merge the same ingredient across meals into one entry (e.g. one meal needing 1 onion and another needing 2 onions becomes one onion entry noting the combined amount).
- Ignore anything that is not a purchasable grocery ingredient: prep steps, cook times, serving sizes, stray recipe links, headings.
- Normalize obviously-equivalent items together (e.g. yellow onion and onion).
- Keep it concise, one entry per distinct ingredient, ordered roughly by grocery-aisle grouping (produce, dairy, meat, pantry, etc.) if reasonable.
- If nothing in the notes looks like real ingredients, return an empty array.`;

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

function hashMealNotes(mealNotes: { title: string; notes: string }[]): string {
  const content = mealNotes.map((m) => m.title + '::' + m.notes).join('\n---\n');
  return createHash('sha256').update(content).digest('hex');
}

function slugify(name: string, fallbackIndex: number): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'item-' + fallbackIndex;
}

async function extractShoppingList(mealNotes: { title: string; notes: string }[]): Promise<{ name: string; detail: string }[]> {
  const input = mealNotes.map((m) => '## ' + m.title + '\n' + m.notes).join('\n\n');
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1536,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: "This week's planned meals:\n\n" + input }],
  });

  await recordGeneration(message.usage.input_tokens, message.usage.output_tokens);

  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') return [];

  const raw = textBlock.text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((i): i is { name: string; detail?: unknown } => !!i && typeof i === 'object' && typeof (i as { name?: unknown }).name === 'string')
      .map((i) => ({ name: i.name.trim(), detail: typeof i.detail === 'string' ? i.detail.trim() : '' }))
      .filter((i) => i.name.length > 0);
  } catch {
    return [];
  }
}

export async function getShoppingList(
  weekStart: string,
  opts: { forceRegenerate?: boolean } = {}
): Promise<{ ingredients: AggregatedIngredient[]; extraItems: ExtraItem[] }> {
  const [plan, state] = await Promise.all([getMealPlan(), getWeekState(weekStart)]);

  const dates = weekDateKeys(weekStart);
  const entriesByDate = dates.map((date) => mealsForDate(plan, date));
  const recipeIds = Array.from(
    new Set(
      entriesByDate.flatMap((slots) => MEAL_TYPES.map((mt) => slots[mt]?.recipeId).filter((id): id is string => !!id))
    )
  );
  const recipes = await getRecipesByIds(recipeIds);

  const mealNotes: { title: string; notes: string }[] = [];
  for (const slots of entriesByDate) {
    for (const mealType of MEAL_TYPES) {
      const entry = slots[mealType];
      const recipe = entry && recipes[entry.recipeId];
      const notes = recipe?.notes?.trim();
      if (recipe && notes) mealNotes.push({ title: recipe.title, notes });
    }
  }

  if (mealNotes.length === 0) {
    if (state.aiItems || state.aiHash) {
      await saveWeekState(weekStart, { ...state, aiItems: undefined, aiHash: undefined });
    }
    return { ingredients: [], extraItems: state.extraItems };
  }

  const hash = hashMealNotes(mealNotes);
  let items = state.aiItems;
  if (opts.forceRegenerate || !items || state.aiHash !== hash) {
    items = await extractShoppingList(mealNotes);
    await saveWeekState(weekStart, { ...state, aiItems: items, aiHash: hash });
  }

  const ingredients: AggregatedIngredient[] = items.map((item, i) => {
    const id = slugify(item.name, i);
    return { id, name: item.name, detail: item.detail, checked: state.checkedIngredients.includes(id) };
  });

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
