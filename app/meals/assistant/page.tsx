import Link from 'next/link';
import { MealAssistant } from '@/components/MealAssistant';

export default function MealAssistantPage() {
  return (
    // pb-80: the on-screen kiosk keyboard covers ~300px at the bottom of the
    // viewport and can only scroll the input above it if the page has real
    // overflow to scroll into — this page is short with few messages, so
    // without this the keyboard permanently hides the send row.
    <main className="min-h-screen text-text p-4 sm:p-8 pb-80 sm:pb-80">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/meals"
          className="inline-flex items-center gap-1.5 mb-4 px-3 py-2 rounded-lg bg-surface hover:bg-surface-elevated border border-border-themed text-text text-sm font-medium transition"
        >
          ← Meal Planner
        </Link>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">🤖 Ask About Meals</h1>
        <p className="text-text-muted mb-8">Chat about what to make — it knows what you&apos;ve made before and how it was rated.</p>
        <MealAssistant />
      </div>
    </main>
  );
}
