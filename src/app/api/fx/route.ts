import { NextResponse } from 'next/server';
import { getFxRateInfo } from '@/lib/prices';

export async function GET() {
  try {
    const { rate, live } = await getFxRateInfo();
    return NextResponse.json({ rate, live, updated_at: new Date().toISOString() });
  } catch (err) {
    console.error('[fx]', err);
    return NextResponse.json({ error: 'Failed to fetch FX rate' }, { status: 500 });
  }
}
