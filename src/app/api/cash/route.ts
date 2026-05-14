import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

interface CashRow {
  id: number;
  amount: number;
  last_updated: string;
}

export async function GET() {
  try {
    const db = getDb();
    const row = db.prepare('SELECT * FROM cash_balance WHERE id = 1').get() as CashRow;
    return NextResponse.json(row ?? { id: 1, amount: 0, last_updated: null });
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
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }
    db.prepare(`
      UPDATE cash_balance SET amount = ?, last_updated = datetime('now') WHERE id = 1
    `).run(amount);
    const row = db.prepare('SELECT * FROM cash_balance WHERE id = 1').get() as CashRow;
    return NextResponse.json(row);
  } catch (err) {
    console.error('[cash PUT]', err);
    return NextResponse.json({ error: 'Failed to update cash balance' }, { status: 500 });
  }
}
