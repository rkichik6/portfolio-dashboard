import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const tickersParam = req.nextUrl.searchParams.get('tickers') ?? '';
    const tickers = tickersParam.split(',').map(t => t.trim()).filter(Boolean);
    if (tickers.length === 0) return NextResponse.json({});

    const db = getDb();
    const placeholders = tickers.map(() => '?').join(',');
    const rows = db.prepare(
      `SELECT ticker, description FROM company_descriptions WHERE ticker IN (${placeholders})`
    ).all(...tickers) as { ticker: string; description: string }[];

    const result: Record<string, string> = {};
    for (const row of rows) result[row.ticker] = row.description;
    return NextResponse.json(result);
  } catch (err) {
    console.error('[descriptions GET]', err);
    return NextResponse.json({});
  }
}
