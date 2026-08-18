import { readStore, writeStore } from './storage';
import { MealType } from './mealTypes';

export type Ingredient = { name: string; quantity?: string; unit?: string };

export type Recipe = {
  id: string;
  title: string;
  emoji: string;
  mealTypes: MealType[];
  notes?: string;
  ingredients?: Ingredient[];
  url?: string;
  sourceLabel?: string;
  photoUrl?: string;
  kidsRating?: number;
  parentsRating?: number;
  createdAt: string;
  updatedAt: string;
};

type RecipeStore = Record<string, Recipe>;

const DEFAULT_STORE: RecipeStore = {};

export async function getRecipes(): Promise<Recipe[]> {
  const store = await readStore('recipes', DEFAULT_STORE);
  return Object.values(store).sort((a, b) => a.title.localeCompare(b.title));
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  const store = await readStore('recipes', DEFAULT_STORE);
  return store[id] ?? null;
}

export async function getRecipesByIds(ids: string[]): Promise<Record<string, Recipe>> {
  const store = await readStore('recipes', DEFAULT_STORE);
  const result: Record<string, Recipe> = {};
  for (const id of ids) if (store[id]) result[id] = store[id];
  return result;
}

export async function createRecipe(input: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>): Promise<Recipe> {
  const store = await readStore('recipes', DEFAULT_STORE);
  const now = new Date().toISOString();
  const recipe: Recipe = { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
  store[recipe.id] = recipe;
  await writeStore('recipes', store);
  return recipe;
}

export async function updateRecipe(id: string, patch: Partial<Omit<Recipe, 'id' | 'createdAt'>>): Promise<Recipe | null> {
  const store = await readStore('recipes', DEFAULT_STORE);
  const existing = store[id];
  if (!existing) return null;
  const updated: Recipe = { ...existing, ...patch, updatedAt: new Date().toISOString() };
  store[id] = updated;
  await writeStore('recipes', store);
  return updated;
}

export async function deleteRecipe(id: string): Promise<void> {
  const store = await readStore('recipes', DEFAULT_STORE);
  delete store[id];
  await writeStore('recipes', store);
}
