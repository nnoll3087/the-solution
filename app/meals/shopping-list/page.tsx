import { getShoppingList } from '@/lib/shoppingList';
import { toDateKey, startOfWeek } from '@/lib/dates';
import { ShoppingList } from '@/components/ShoppingList';
import { PageHeader } from '@/components/PageHeader';

export default async function ShoppingListPage() {
  const weekStart = toDateKey(startOfWeek(new Date()));
  const { ingredients, extraItems } = await getShoppingList(weekStart);

  return (
    <main className="min-h-screen text-text p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <PageHeader
          backHref="/meals"
          backLabel="← Meal Planner"
          title="Shopping List"
          description="Ingredients for the week's planned meals, plus anything else you need."
        />
        <ShoppingList initialWeekStart={weekStart} initialIngredients={ingredients} initialExtraItems={extraItems} />
      </div>
    </main>
  );
}
