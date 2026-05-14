import { NextRequest, NextResponse } from 'next/server';
import { getPrices } from '@/lib/prices';

export async function GET(req: NextRequest) {
  try {
    const tickersParam = req.nextUrl.searchParams.get('tickers') ?? '';
    const tickers = tickersParam.split(',').map(t => t.trim()).filter(Boolean);
    if (tickers.length === 0) {
      return NextResponse.json({ error: 'No tickers provided' }, { status: 400 });
    }
    const prices = await getPrices(tickers);
    return NextResponse.json(prices);
  } catch (err) {
    console.error('[prices]', err);
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 });
  }
}
