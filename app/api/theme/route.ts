import { NextResponse } from 'next/server';
import { getTheme, clearTheme, DEFAULT_THEME } from '@/lib/theme';

export async function GET() {
  return NextResponse.json({ theme: getTheme() });
}

export async function DELETE() {
  clearTheme();
  return NextResponse.json({ theme: DEFAULT_THEME });
}