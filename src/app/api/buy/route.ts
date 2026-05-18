export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { recalculateHolding } from '@/lib/recalculate';

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json() as {
      portfolio_id?: number;
      ticker: string;
      name: string;
      shares: number;
      price_mxn: number;
      date: string;
      bucket: string;
      conviction: string;
      thesis?: string | null;
    };

    const { ticker, name, shares, price_mxn, date, bucket, conviction, thesis } = body;
    const portfolioId = body.portfolio_id ?? 1;
    const tickerUpper = ticker.toUpperCase();
    const cost = shares * price_mxn;

    const existing = db.prepare('SELECT id FROM holdings WHERE ticker = ? AND portfolio_id = ?').get(tickerUpper, portfolioId) as { id: number } | undefined;

    db.transaction(() => {
      db.prepare(`
        INSERT INTO trade_log (portfolio_id, ticker, name, action, shares, price_mxn, total_mxn, date, notes)
        VALUES (?, ?, ?, 'BUY', ?, ?, ?, ?, ?)
      `).run(portfolioId, tickerUpper, name, shares, price_mxn, cost, date, existing ? 'Added to position' : 'New position');

      db.prepare(`
        UPDATE cash_balance SET amount = amount - ?, last_updated = datetime('now')
        WHERE portfolio_id = ? AND initialized = 1
      `).run(cost, portfolioId);

      if (existing) {
        db.prepare(`
          UPDATE holdings SET bucket = ?, conviction = ?, thesis = ?, updated_at = datetime('now')
          WHERE ticker = ? AND portfolio_id = ?
        `).run(bucket, conviction, thesis ?? null, tickerUpper, portfolioId);
        recalculateHolding(db, tickerUpper, portfolioId);
      } else {
        db.prepare(`
          INSERT INTO holdings (portfolio_id, ticker, name, shares, entry_price_mxn, entry_date, bucket, conviction, thesis, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(portfolioId, tickerUpper, name, shares, price_mxn, date, bucket, conviction, thesis ?? null);
      }
    })();

    return NextResponse.json({ success: true, isNew: !existing });
  } catch (err) {
    console.error('[buy POST]', err);
    return NextResponse.json({ error: 'Failed to process buy' }, { status: 500 });
  }
}
