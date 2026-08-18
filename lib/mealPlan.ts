import { readStore, writeStore } from './storage';

export type MealPlanEntry = { recipeId: string; notes?: string };

type MealPlanStore = Record<string, MealPlanEntry>;

const DEFAULT_STORE: MealPlanStore = {};

export async function getMealPlan(): Promise<MealPlanStore> {
  return readStore('meal-plan', DEFAULT_STORE);
}

export async function setMeal(date: string, entry: MealPlanEntry): Promise<void> {
  const store = await readStore('meal-plan', DEFAULT_STORE);
  store[date] = entry;
  await writeStore('meal-plan', store);
}

export async function clearMeal(date: string): Promise<void> {
  const store = await readStore('meal-plan', DEFAULT_STORE);
  delete store[date];
  await writeStore('meal-plan', store);
}
