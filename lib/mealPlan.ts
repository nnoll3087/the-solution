import { readStore, writeStore } from './storage';
import { MealType, MEAL_TYPES, JoinedMealPlanEntry } from './mealTypes';
import { getRecipesByIds } from './recipes';

export type MealPlanEntry = { recipeId: string; mealType: MealType; notes?: string };
export type { JoinedMealPlanEntry };

type MealPlanStore = Record<string, MealPlanEntry>;

const DEFAULT_STORE: MealPlanStore = {};

function key(date: string, mealType: MealType): string {
  return date + ':' + mealType;
}

export async function getMealPlan(): Promise<MealPlanStore> {
  return readStore('meal-plan', DEFAULT_STORE);
}

// Meal-plan entries joined with the recipe's display info (title, emoji), so
// calendar/planner UI never needs a second round-trip to fetch recipes.
export async function getJoinedMealPlan(): Promise<Record<string, JoinedMealPlanEntry>> {
  const plan = await getMealPlan();
  const recipeIds = Array.from(new Set(Object.values(plan).map((e) => e.recipeId)));
  const recipes = await getRecipesByIds(recipeIds);

  const joined: Record<string, JoinedMealPlanEntry> = {};
  const stale: string[] = [];
  for (const [k, entry] of Object.entries(plan)) {
    const recipe = recipes[entry.recipeId];
    if (!recipe) {
      stale.push(k);
      continue;
    }
    joined[k] = {
      recipeId: entry.recipeId,
      mealType: entry.mealType,
      title: recipe.title,
      emoji: recipe.emoji,
      kidsRating: recipe.kidsRating,
      parentsRating: recipe.parentsRating,
      notes: recipe.notes,
      photoUrl: recipe.photoUrl,
      url: recipe.url,
      sourceLabel: recipe.sourceLabel,
    };
  }
  // A slot whose recipe was deleted elsewhere is a dangling pointer, not a
  // real entry — drop it from the store so it stops silently disappearing
  // from every read instead of lingering as an invisible landmine.
  if (stale.length > 0) {
    const store = await readStore('meal-plan', DEFAULT_STORE);
    for (const k of stale) delete store[k];
    await writeStore('meal-plan', store);
  }
  return joined;
}

// Groups a date's entries by meal type — undefined for empty slots.
export function mealsForDate(plan: MealPlanStore, date: string): Record<MealType, MealPlanEntry | undefined> {
  const result = {} as Record<MealType, MealPlanEntry | undefined>;
  for (const mealType of MEAL_TYPES) result[mealType] = plan[key(date, mealType)];
  return result;
}

export async function setMeal(date: string, mealType: MealType, entry: Omit<MealPlanEntry, 'mealType'>): Promise<void> {
  const store = await readStore('meal-plan', DEFAULT_STORE);
  store[key(date, mealType)] = { ...entry, mealType };
  await writeStore('meal-plan', store);
}

export async function clearMeal(date: string, mealType: MealType): Promise<void> {
  const store = await readStore('meal-plan', DEFAULT_STORE);
  delete store[key(date, mealType)];
  await writeStore('meal-plan', store);
}
