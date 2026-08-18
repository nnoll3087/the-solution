import Link from 'next/link';
import { getRecipes } from '@/lib/recipes';
import { getMealPlan } from '@/lib/mealPlan';
import { MealPlanner } from '@/components/MealPlanner';

export default async function MealsPage() {
  const [recipes, plan] = await Promise.all([getRecipes(), getMealPlan()]);

  return (
    <main className="min-h-screen text-text p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface hover:bg-surface-elevated border border-border-themed text-text text-sm font-medium transition"
          >
            ← Back to calendar
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/meals/shopping-list"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface hover:bg-surface-elevated border border-border-themed text-text text-sm font-medium transition"
            >
              🛒 Shopping List
            </Link>
            <Link
              href="/meals/recipes"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface hover:bg-surface-elevated border border-border-themed text-text text-sm font-medium transition"
            >
              Recipe Library →
            </Link>
          </div>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Meal Planner</h1>
        <p className="text-text-muted mb-8">Assign a recipe to each day of the week.</p>
        <MealPlanner initialRecipes={recipes} initialPlan={plan} />
      </div>
    </main>
  );
}
