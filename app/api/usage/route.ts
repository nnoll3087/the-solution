import { NextRequest, NextResponse } from 'next/server';
import { getUsage, setBalance, remainingUsd } from '@/lib/usage';

export async function GET() {
  const usage = await getUsage();
  return NextResponse.json({
    remainingUsd: remainingUsd(usage),
    balanceUsd: usage.balanceUsd,
    balanceSetAt: usage.balanceSetAt,
    totalSpentUsd: usage.totalSpentUsd,
    generationCount: usage.generationCount,
    lastGeneration: usage.lastGeneration,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { balanceUsd } = body;

  if (typeof balanceUsd !== 'number' || !isFinite(balanceUsd) || balanceUsd < 0) {
    return NextResponse.json({ error: 'balanceUsd must be a non-negative number' }, { status: 400 });
  }

  await setBalance(balanceUsd);
  return NextResponse.json({ success: true });
}
