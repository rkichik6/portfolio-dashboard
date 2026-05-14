import { NextResponse } from 'next/server';
import { getFxRate } from '@/lib/prices';

export async function GET() {
  try {
    const rate = await getFxRate();
    return NextResponse.json({ rate, updated_at: new Date().toISOString() });
  } catch (err) {
    console.error('[fx]', err);
    return NextResponse.json({ error: 'Failed to fetch FX rate' }, { status: 500 });
  }
}
