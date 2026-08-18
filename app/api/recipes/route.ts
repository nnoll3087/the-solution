import { NextRequest, NextResponse } from 'next/server';
import { getRecipes, createRecipe, updateRecipe, deleteRecipe, Ingredient } from '@/lib/recipes';
import { suggestEmoji } from '@/lib/mealEmoji';

function cleanIngredients(input: unknown): Ingredient[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const cleaned = input
    .filter((i): i is Record<string, unknown> => !!i && typeof i === 'object')
    .map((i) => ({
      name: typeof i.name === 'string' ? i.name.trim() : '',
      quantity: typeof i.quantity === 'string' && i.quantity.trim() ? i.quantity.trim() : undefined,
      unit: typeof i.unit === 'string' && i.unit.trim() ? i.unit.trim() : undefined,
    }))
    .filter((i) => i.name.length > 0);
  return cleaned.length > 0 ? cleaned : undefined;
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
  const title = body.title.trim();
  const recipe = await createRecipe({
    title,
    emoji: typeof body.emoji === 'string' && body.emoji.trim() ? body.emoji.trim() : suggestEmoji(title),
    notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : undefined,
    ingredients: cleanIngredients(body.ingredients),
    url: typeof body.url === 'string' && body.url.trim() ? body.url.trim() : undefined,
    sourceLabel: typeof body.sourceLabel === 'string' && body.sourceLabel.trim() ? body.sourceLabel.trim() : undefined,
  });
  return NextResponse.json({ recipe });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (typeof body.id !== 'string') return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const patch: Record<string, unknown> = {};
  if (typeof body.title === 'string' && body.title.trim()) patch.title = body.title.trim();
  if (typeof body.emoji === 'string' && body.emoji.trim()) patch.emoji = body.emoji.trim();
  if ('notes' in body) patch.notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : undefined;
  if ('ingredients' in body) patch.ingredients = cleanIngredients(body.ingredients);
  if ('url' in body) patch.url = typeof body.url === 'string' && body.url.trim() ? body.url.trim() : undefined;
  if ('sourceLabel' in body) patch.sourceLabel = typeof body.sourceLabel === 'string' && body.sourceLabel.trim() ? body.sourceLabel.trim() : undefined;

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
