import { NextRequest, NextResponse } from 'next/server';
import { getPreferences, savePreferences, setPersonPreference } from '@/lib/queue';

export async function GET() {
  return NextResponse.json(await getPreferences());
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;

  if (action === 'set_person') {
    const { calendarKey, clearMode, clearAfterHours } = body;
    await setPersonPreference({ calendarKey, clearMode, clearAfterHours });
    return NextResponse.json({ success: true });
  }

  if (action === 'set_defaults') {
    const prefs = await getPreferences();
    await savePreferences({
      ...prefs,
      defaultClearMode: body.defaultClearMode ?? prefs.defaultClearMode,
      defaultClearAfterHours: body.defaultClearAfterHours ?? prefs.defaultClearAfterHours,
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
