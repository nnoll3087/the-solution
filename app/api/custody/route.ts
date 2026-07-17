import { NextRequest, NextResponse } from 'next/server';
import { getCustodyConfig, saveCustodyConfig, CustodyRule } from '@/lib/config';

export async function GET() {
  return NextResponse.json({ custody: await getCustodyConfig() });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { calendarKey, rules } = body;

  if (!calendarKey) {
    await saveCustodyConfig(null);
    return NextResponse.json({ success: true });
  }

  if (typeof calendarKey !== 'string' || !Array.isArray(rules)) {
    return NextResponse.json({ error: 'calendarKey and rules[] are required' }, { status: 400 });
  }

  const clean: CustodyRule[] = rules
    .filter((r) => r && typeof r.match === 'string' && r.match.trim() && typeof r.color === 'string')
    .map((r) => ({
      match: r.match.trim(),
      label: typeof r.label === 'string' && r.label.trim() ? r.label.trim() : r.match.trim(),
      color: r.color,
    }));

  await saveCustodyConfig({ calendarKey, rules: clean });
  return NextResponse.json({ success: true });
}
