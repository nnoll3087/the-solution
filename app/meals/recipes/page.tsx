import { getRecipes } from '@/lib/recipes';
import { RecipeLibrary } from '@/components/RecipeLibrary';
import { PageHeader } from '@/components/PageHeader';

// See app/meals/page.tsx: reads Postgres directly, so it must be forced
// dynamic or it prerenders once at build time and never sees new recipes.
export const dynamic = 'force-dynamic';

export default async function RecipeLibraryPage() {
  const recipes = await getRecipes();

  return (
    <main className="min-h-screen text-text p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <PageHeader
          backHref="/meals"
          backLabel="← Meal Planner"
          title="All Meals"
          description="Every meal anyone's typed in. Edit the details or remove one for good."
        />
        <RecipeLibrary initialRecipes={recipes} />
      </div>
    </main>
  );
}
