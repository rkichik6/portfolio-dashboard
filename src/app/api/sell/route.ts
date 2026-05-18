export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { recalculateHolding } from '@/lib/recalculate';

interface HoldingRow {
  id: number;
  portfolio_id: number;
  ticker: string;
  name: string;
  shares: number;
  entry_price_mxn: number;
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json() as {
      portfolio_id?: number;
      ticker: string;
      shares: number;
      price_mxn: number;
      date: string;
      notes?: string | null;
    };

    const { ticker, shares, price_mxn, date, notes } = body;
    const portfolioId = body.portfolio_id ?? 1;
    const tickerUpper = ticker.toUpperCase();

    const holding = db.prepare('SELECT * FROM holdings WHERE ticker = ? AND portfolio_id = ?').get(tickerUpper, portfolioId) as HoldingRow | undefined;
    if (!holding) {
      return NextResponse.json({ error: `No position found for ${tickerUpper}.` }, { status: 404 });
    }
    if (shares > holding.shares + 0.0001) {
      return NextResponse.json({
        error: `You only hold ${holding.shares} shares of ${tickerUpper}.`,
      }, { status: 400 });
    }

    const proceeds = shares * price_mxn;
    const realized_pnl = (price_mxn - holding.entry_price_mxn) * shares;

    try {
      db.transaction(() => {
        db.prepare(`
          INSERT INTO trade_log (portfolio_id, ticker, name, action, shares, price_mxn, total_mxn, date, notes, realized_pnl_mxn)
          VALUES (?, ?, ?, 'SELL', ?, ?, ?, ?, ?, ?)
        `).run(portfolioId, tickerUpper, holding.name, shares, price_mxn, proceeds, date, notes ?? null, realized_pnl);

        db.prepare(`
          UPDATE cash_balance SET amount = amount + ?, last_updated = datetime('now') WHERE portfolio_id = ?
        `).run(proceeds, portfolioId);

        recalculateHolding(db, tickerUpper, portfolioId);
      })();
    } catch (err) {
      if (err instanceof Error && err.message === 'NEGATIVE_POSITION') {
        return NextResponse.json({ error: 'This sell would result in a negative position.' }, { status: 422 });
      }
      throw err;
    }

    return NextResponse.json({ success: true, realized_pnl, proceeds });
  } catch (err) {
    console.error('[sell POST]', err);
    return NextResponse.json({ error: 'Failed to process sell' }, { status: 500 });
  }
}
