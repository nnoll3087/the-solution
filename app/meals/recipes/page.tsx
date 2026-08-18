import { getRecipes } from '@/lib/recipes';
import { RecipeLibrary } from '@/components/RecipeLibrary';
import { PageHeader } from '@/components/PageHeader';

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
