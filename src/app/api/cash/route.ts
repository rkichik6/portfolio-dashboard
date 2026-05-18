export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

interface CashRow {
  portfolio_id: number;
  amount: number;
  initialized: number;
  last_updated: string | null;
}

interface HoldingRow {
  shares: number;
  entry_price_mxn: number;
}

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const portfolioId = parseInt(req.nextUrl.searchParams.get('portfolio_id') ?? '1') || 1;
    const row = db.prepare('SELECT * FROM cash_balance WHERE portfolio_id = ?').get(portfolioId) as CashRow | undefined;
    return NextResponse.json(row ?? { portfolio_id: portfolioId, amount: 0, initialized: 0, last_updated: null });
  } catch (err) {
    console.error('[cash GET]', err);
    return NextResponse.json({ error: 'Failed to fetch cash balance' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = getDb();
    const portfolioId = parseInt(req.nextUrl.searchParams.get('portfolio_id') ?? '1') || 1;
    const { amount } = await req.json() as { amount: number };

    if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
      return NextResponse.json({ error: 'Invalid amount — must be a positive number' }, { status: 400 });
    }

    const current = db.prepare('SELECT * FROM cash_balance WHERE portfolio_id = ?').get(portfolioId) as CashRow | undefined;

    let storedAmount = amount;
    let holdingsCost = 0;

    if (!current?.initialized) {
      const holdings = db.prepare(
        'SELECT shares, entry_price_mxn FROM holdings WHERE portfolio_id = ?'
      ).all(portfolioId) as HoldingRow[];
      holdingsCost = holdings.reduce((sum, h) => sum + h.shares * h.entry_price_mxn, 0);
      storedAmount = amount - holdingsCost;
    }

    db.prepare(`
      INSERT INTO cash_balance (portfolio_id, amount, initialized, last_updated)
      VALUES (?, ?, 1, datetime('now'))
      ON CONFLICT(portfolio_id) DO UPDATE SET
        amount = excluded.amount,
        initialized = 1,
        last_updated = excluded.last_updated
    `).run(portfolioId, storedAmount);

    const updated = db.prepare('SELECT * FROM cash_balance WHERE portfolio_id = ?').get(portfolioId) as CashRow;
    return NextResponse.json({ ...updated, holdings_cost_deducted: holdingsCost });
  } catch (err) {
    console.error('[cash PUT]', err);
    return NextResponse.json({ error: 'Failed to update cash balance' }, { status: 500 });
  }
}
