import { NextRequest, NextResponse } from 'next/server';
import { fetchAllEvents } from '@/lib/events';

export async function GET(request: NextRequest) {
  const timeMinParam = request.nextUrl.searchParams.get('timeMin');
  const timeMaxParam = request.nextUrl.searchParams.get('timeMax');
  if (!timeMinParam || !timeMaxParam) {
    return NextResponse.json({ error: 'Missing timeMin or timeMax' }, { status: 400 });
  }
  const timeMin = new Date(timeMinParam);
  const timeMax = new Date(timeMaxParam);
  const events = await fetchAllEvents(timeMin, timeMax);
  return NextResponse.json({ events });
}
