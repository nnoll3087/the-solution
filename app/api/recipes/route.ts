import { NextRequest, NextResponse } from 'next/server';
import { getRecipes, createRecipe, updateRecipe, deleteRecipe } from '@/lib/recipes';
import { suggestEmoji } from '@/lib/mealEmoji';
import { MealType, isMealType } from '@/lib/mealTypes';

function cleanMealTypes(input: unknown): MealType[] | null {
  if (!Array.isArray(input)) return null;
  const cleaned = Array.from(new Set(input.filter(isMealType)));
  return cleaned.length > 0 ? cleaned : null;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.toLowerCase().trim();
  const recipes = await getRecipes();
  const filtered = q ? recipes.filter((r) => r.title.toLowerCase().includes(q)) : recipes;
  return NextResponse.json({ recipes: filtered });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (typeof body.title !== 'string' || !body.title.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }
  const mealTypes = cleanMealTypes(body.mealTypes);
  if (!mealTypes) {
    return NextResponse.json({ error: 'At least one meal type is required' }, { status: 400 });
  }
  const title = body.title.trim();
  const recipe = await createRecipe({
    title,
    emoji: typeof body.emoji === 'string' && body.emoji.trim() ? body.emoji.trim() : suggestEmoji(title),
    mealTypes,
    notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : undefined,
    url: typeof body.url === 'string' && body.url.trim() ? body.url.trim() : undefined,
    sourceLabel: typeof body.sourceLabel === 'string' && body.sourceLabel.trim() ? body.sourceLabel.trim() : undefined,
    photoUrl: typeof body.photoUrl === 'string' && body.photoUrl.trim() ? body.photoUrl.trim() : undefined,
  });
  return NextResponse.json({ recipe });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (typeof body.id !== 'string') return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const patch: Record<string, unknown> = {};
  if (typeof body.title === 'string' && body.title.trim()) patch.title = body.title.trim();
  if (typeof body.emoji === 'string' && body.emoji.trim()) patch.emoji = body.emoji.trim();
  if ('mealTypes' in body) {
    const mealTypes = cleanMealTypes(body.mealTypes);
    if (!mealTypes) return NextResponse.json({ error: 'At least one meal type is required' }, { status: 400 });
    patch.mealTypes = mealTypes;
  }
  if ('notes' in body) patch.notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : undefined;
  if ('url' in body) patch.url = typeof body.url === 'string' && body.url.trim() ? body.url.trim() : undefined;
  if ('sourceLabel' in body) patch.sourceLabel = typeof body.sourceLabel === 'string' && body.sourceLabel.trim() ? body.sourceLabel.trim() : undefined;
  if ('photoUrl' in body) patch.photoUrl = typeof body.photoUrl === 'string' && body.photoUrl.trim() ? body.photoUrl.trim() : undefined;
  if ('kidsRating' in body) {
    const r = body.kidsRating;
    patch.kidsRating = typeof r === 'number' && r >= 0 && r <= 5 ? r : undefined;
  }
  if ('parentsRating' in body) {
    const r = body.parentsRating;
    patch.parentsRating = typeof r === 'number' && r >= 0 && r <= 5 ? r : undefined;
  }

  const recipe = await updateRecipe(body.id, patch);
  if (!recipe) return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
  return NextResponse.json({ recipe });
}

export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (typeof body.id !== 'string') return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  await deleteRecipe(body.id);
  return NextResponse.json({ ok: true });
}
