import { NextRequest, NextResponse } from 'next/server';
import { getExcludedTitles, saveExcludedTitles } from '@/lib/config';

export async function GET() {
  return NextResponse.json({ excludedTitles: await getExcludedTitles() });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { excludedTitles } = body;

  if (!Array.isArray(excludedTitles)) {
    return NextResponse.json({ error: 'excludedTitles[] is required' }, { status: 400 });
  }

  const clean = [...new Set(
    excludedTitles
      .filter((p): p is string => typeof p === 'string')
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
  )];

  await saveExcludedTitles(clean);
  return NextResponse.json({ success: true, excludedTitles: clean });
}
