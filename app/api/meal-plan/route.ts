import { NextRequest, NextResponse } from 'next/server';
import { getJoinedMealPlan, setMeal, clearMeal } from '@/lib/mealPlan';
import { getRecipe } from '@/lib/recipes';
import { isMealType } from '@/lib/mealTypes';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET() {
  return NextResponse.json({ plan: await getJoinedMealPlan() });
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (typeof body.date !== 'string' || !DATE_RE.test(body.date)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
  }
  if (!isMealType(body.mealType)) {
    return NextResponse.json({ error: 'Invalid mealType' }, { status: 400 });
  }
  if (typeof body.recipeId !== 'string' || !body.recipeId) {
    return NextResponse.json({ error: 'Missing recipeId' }, { status: 400 });
  }
  const recipe = await getRecipe(body.recipeId);
  if (!recipe) return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });

  await setMeal(body.date, body.mealType, {
    recipeId: body.recipeId,
    notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : undefined,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (typeof body.date !== 'string' || !DATE_RE.test(body.date)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
  }
  if (!isMealType(body.mealType)) {
    return NextResponse.json({ error: 'Invalid mealType' }, { status: 400 });
  }
  await clearMeal(body.date, body.mealType);
  return NextResponse.json({ ok: true });
}
