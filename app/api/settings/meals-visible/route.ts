import { NextRequest, NextResponse } from 'next/server';
import { getMealsVisible, saveMealsVisible } from '@/lib/config';

export async function GET() {
  return NextResponse.json({ mealsVisible: await getMealsVisible() });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (typeof body.mealsVisible !== 'boolean') {
    return NextResponse.json({ error: 'mealsVisible must be a boolean' }, { status: 400 });
  }
  await saveMealsVisible(body.mealsVisible);
  return NextResponse.json({ mealsVisible: body.mealsVisible });
}
