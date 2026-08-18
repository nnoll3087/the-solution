import { MealAssistant } from '@/components/MealAssistant';
import { PageHeader } from '@/components/PageHeader';

export default function MealAssistantPage() {
  return (
    // pb-80: the on-screen kiosk keyboard covers ~300px at the bottom of the
    // viewport and can only scroll the input above it if the page has real
    // overflow to scroll into — this page is short with few messages, so
    // without this the keyboard permanently hides the send row.
    <main className="min-h-screen text-text p-4 sm:p-8 pb-80 sm:pb-80">
      <div className="max-w-2xl mx-auto">
        <PageHeader
          backHref="/meals"
          backLabel="← Meal Planner"
          title="🤖 Ask About Meals"
          description="Chat about what to make — it knows what you've made before and how it was rated."
        />
        <MealAssistant />
      </div>
    </main>
  );
}
