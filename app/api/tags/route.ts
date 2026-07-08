import { NextRequest, NextResponse } from 'next/server';
import { getAllTags, setEventTags } from '@/lib/tags';

export async function GET() {
  return NextResponse.json({ tags: await getAllTags() });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { eventId, tags } = body;

  if (!eventId || typeof eventId !== 'string' || !Array.isArray(tags)) {
    return NextResponse.json({ error: 'eventId and tags[] are required' }, { status: 400 });
  }

  await setEventTags(eventId, tags.filter((t: unknown) => typeof t === 'string'));
  return NextResponse.json({ success: true });
}
