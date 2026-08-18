import Link from 'next/link';
import { getRecipes } from '@/lib/recipes';
import { RecipeLibrary } from '@/components/RecipeLibrary';

export default async function RecipeLibraryPage() {
  const recipes = await getRecipes();

  return (
    <main className="min-h-screen text-text p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/meals"
          className="inline-flex items-center gap-1.5 mb-4 px-3 py-2 rounded-lg bg-surface hover:bg-surface-elevated border border-border-themed text-text text-sm font-medium transition"
        >
          ← Meal Planner
        </Link>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Recipe Library</h1>
        <p className="text-text-muted mb-8">Every recipe you&apos;ve saved. Search, edit, or add a new one.</p>
        <RecipeLibrary initialRecipes={recipes} />
      </div>
    </main>
  );
}
