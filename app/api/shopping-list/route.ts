import { NextRequest, NextResponse } from 'next/server';
import {
  getShoppingList,
  setIngredientChecked,
  setExtraItemChecked,
  addExtraItem,
  removeExtraItem,
} from '@/lib/shoppingList';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function badWeek() {
  return NextResponse.json({ error: 'Invalid or missing week' }, { status: 400 });
}

export async function GET(request: NextRequest) {
  const week = request.nextUrl.searchParams.get('week');
  if (!week || !DATE_RE.test(week)) return badWeek();
  const forceRegenerate = request.nextUrl.searchParams.get('regenerate') === '1';
  const list = await getShoppingList(week, { forceRegenerate });
  return NextResponse.json(list);
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (typeof body.week !== 'string' || !DATE_RE.test(body.week)) return badWeek();
  if (typeof body.checked !== 'boolean') {
    return NextResponse.json({ error: 'Missing checked' }, { status: 400 });
  }
  if (body.type === 'ingredient' && typeof body.id === 'string') {
    await setIngredientChecked(body.week, body.id, body.checked);
  } else if (body.type === 'extra' && typeof body.id === 'string') {
    await setExtraItemChecked(body.week, body.id, body.checked);
  } else {
    return NextResponse.json({ error: 'Invalid item' }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (typeof body.week !== 'string' || !DATE_RE.test(body.week)) return badWeek();
  if (typeof body.text !== 'string' || !body.text.trim()) {
    return NextResponse.json({ error: 'Missing text' }, { status: 400 });
  }
  const item = await addExtraItem(body.week, body.text.trim());
  return NextResponse.json({ item });
}

export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (typeof body.week !== 'string' || !DATE_RE.test(body.week)) return badWeek();
  if (typeof body.id !== 'string') return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  await removeExtraItem(body.week, body.id);
  return NextResponse.json({ ok: true });
}
