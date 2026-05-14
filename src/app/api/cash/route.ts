import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

interface CashRow {
  id: number;
  amount: number;
  initialized: number;
  last_updated: string;
}

interface HoldingRow {
  shares: number;
  entry_price_mxn: number;
}

export async function GET() {
  try {
    const db = getDb();
    const row = db.prepare('SELECT * FROM cash_balance WHERE id = 1').get() as CashRow;
    return NextResponse.json(row ?? { id: 1, amount: 0, initialized: 0, last_updated: null });
  } catch (err) {
    console.error('[cash GET]', err);
    return NextResponse.json({ error: 'Failed to fetch cash balance' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = getDb();
    const { amount } = await req.json() as { amount: number };

    if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
      return NextResponse.json({ error: 'Invalid amount — must be a positive number' }, { status: 400 });
    }

    const current = db.prepare('SELECT * FROM cash_balance WHERE id = 1').get() as CashRow;

    let storedAmount = amount;
    let holdingsCost = 0;

    if (!current?.initialized) {
      // First-time setup: subtract cost of all existing open positions
      const holdings = db.prepare('SELECT shares, entry_price_mxn FROM holdings').all() as HoldingRow[];
      holdingsCost = holdings.reduce((sum, h) => sum + h.shares * h.entry_price_mxn, 0);
      storedAmount = amount - holdingsCost;
    }

    db.prepare(`
      UPDATE cash_balance
      SET amount = ?, initialized = 1, last_updated = datetime('now')
      WHERE id = 1
    `).run(storedAmount);

    const updated = db.prepare('SELECT * FROM cash_balance WHERE id = 1').get() as CashRow;
    return NextResponse.json({ ...updated, holdings_cost_deducted: holdingsCost });
  } catch (err) {
    console.error('[cash PUT]', err);
    return NextResponse.json({ error: 'Failed to update cash balance' }, { status: 500 });
  }
}
