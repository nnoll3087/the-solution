import { readStore, writeStore } from './storage';
import { MealType } from './mealTypes';

// Legacy shape, kept only so old records can be migrated on read.
type LegacyIngredient = { name: string; quantity?: string; unit?: string };

export type Recipe = {
  id: string;
  title: string;
  emoji: string;
  mealTypes: MealType[];
  notes?: string;
  url?: string;
  sourceLabel?: string;
  photoUrl?: string;
  kidsRating?: number;
  parentsRating?: number;
  createdAt: string;
  updatedAt: string;
};

type StoredRecipe = Recipe & { ingredients?: LegacyIngredient[] };
type RecipeStore = Record<string, StoredRecipe>;

const DEFAULT_STORE: RecipeStore = {};

// One-time fold of the old structured ingredients array into the freeform
// notes field, since ingredients now live as plain pasted/typed text there.
// In-memory only — every read (getRecipes/getRecipe/getRecipesByIds) used to
// persist this as a side effect, which meant an ordinary read could win a
// whole-document read-modify-write race against a concurrent create/update
// and silently wipe it out. Recipes get upgraded on the way out of every read
// instead; a legacy record re-normalizes each time until something else
// (an edit, a rating) naturally rewrites it for real.
function migrateIngredients(store: RecipeStore): void {
  for (const recipe of Object.values(store)) {
    if (!recipe.ingredients || recipe.ingredients.length === 0) continue;
    const lines = recipe.ingredients
      .map((i) => [i.quantity, i.unit, i.name].filter(Boolean).join(' ').trim())
      .filter(Boolean)
      .join('\n');
    if (lines && !(recipe.notes || '').includes(lines)) {
      recipe.notes = recipe.notes ? lines + '\n\n' + recipe.notes : lines;
    }
    delete recipe.ingredients;
  }
}

async function getMigratedStore(): Promise<RecipeStore> {
  const store = await readStore('recipes', DEFAULT_STORE);
  migrateIngredients(store);
  return store;
}

export async function getRecipes(): Promise<Recipe[]> {
  const store = await getMigratedStore();
  return Object.values(store).sort((a, b) => a.title.localeCompare(b.title));
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  const store = await getMigratedStore();
  return store[id] ?? null;
}

export async function getRecipesByIds(ids: string[]): Promise<Record<string, Recipe>> {
  const store = await getMigratedStore();
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
