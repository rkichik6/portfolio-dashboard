export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export interface Signal {
  ticker: string;
  signal_direction: 'BUY' | 'LEAN_BUY' | 'NEUTRAL' | 'LEAN_SELL' | 'SELL';
  signal_strength: number;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  sentiment_strength: number;
  reasoning: string;
  generated_at: string;
}

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const portfolioId = parseInt(req.nextUrl.searchParams.get('portfolio_id') ?? '1') || 1;
    const rows = db.prepare('SELECT * FROM signals WHERE portfolio_id = ?').all(portfolioId) as Signal[];
    const signals: Record<string, Signal> = {};
    for (const row of rows) {
      signals[row.ticker] = row;
    }
    return NextResponse.json(signals);
  } catch (err) {
    console.error('[signals GET]', err);
    return NextResponse.json({});
  }
}
