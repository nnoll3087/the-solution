import Link from 'next/link';
import { getShoppingList } from '@/lib/shoppingList';
import { toDateKey, startOfWeek } from '@/lib/dates';
import { ShoppingList } from '@/components/ShoppingList';

export default async function ShoppingListPage() {
  const weekStart = toDateKey(startOfWeek(new Date()));
  const { ingredients, extraItems } = await getShoppingList(weekStart);

  return (
    <main className="min-h-screen text-text p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/meals"
          className="inline-flex items-center gap-1.5 mb-4 px-3 py-2 rounded-lg bg-surface hover:bg-surface-elevated border border-border-themed text-text text-sm font-medium transition"
        >
          ← Meal Planner
        </Link>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Shopping List</h1>
        <p className="text-text-muted mb-8">Ingredients for the week&apos;s planned meals, plus anything else you need.</p>
        <ShoppingList initialWeekStart={weekStart} initialIngredients={ingredients} initialExtraItems={extraItems} />
      </div>
    </main>
  );
}
