import { HomeShell } from '@/components/HomeShell';
import { getMealsVisible } from '@/lib/config';

export default async function Home() {
  const mealsVisible = await getMealsVisible();
  return <HomeShell mealsVisible={mealsVisible} />;
}
