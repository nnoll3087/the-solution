import { HomeShell } from '@/components/HomeShell';
import { getMealsVisible } from '@/lib/config';

// See app/meals/page.tsx: reads Postgres directly, so it must be forced
// dynamic or the mealsVisible toggle freezes at whatever it was at build time.
export const dynamic = 'force-dynamic';

export default async function Home() {
  const mealsVisible = await getMealsVisible();
  return <HomeShell mealsVisible={mealsVisible} />;
}
