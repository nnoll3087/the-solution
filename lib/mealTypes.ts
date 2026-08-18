export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export function isMealType(value: unknown): value is MealType {
  return typeof value === 'string' && (MEAL_TYPES as readonly string[]).includes(value);
}

// Client-safe (no server imports) so components can use this shape and the
// grouping helper below without pulling in lib/mealPlan.ts's fs/pg deps.
export type JoinedMealPlanEntry = {
  recipeId: string;
  mealType: MealType;
  title: string;
  emoji: string;
  kidsRating?: number;
  parentsRating?: number;
};

// Groups the flat `date:mealType` -> entry map (as returned by GET
// /api/meal-plan) into per-date arrays for calendar rendering.
export function groupMealsByDate(plan: Record<string, JoinedMealPlanEntry>): Record<string, JoinedMealPlanEntry[]> {
  const byDate: Record<string, JoinedMealPlanEntry[]> = {};
  for (const [key, entry] of Object.entries(plan)) {
    const date = key.slice(0, key.lastIndexOf(':'));
    (byDate[date] ??= []).push(entry);
  }
  return byDate;
}
