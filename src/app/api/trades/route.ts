import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

interface TradeRow {
  id: number;
  ticker: string;
  name: string;
  action: 'BUY' | 'SELL';
  shares: number;
  price_mxn: number;
  total_mxn: number;
  date: string;
  notes: string | null;
  realized_pnl_mxn: number | null;
  created_at: string;
}

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const ticker = req.nextUrl.searchParams.get('ticker');
    const action = req.nextUrl.searchParams.get('action');
    const from = req.nextUrl.searchParams.get('from');
    const to = req.nextUrl.searchParams.get('to');

    let query = 'SELECT * FROM trade_log WHERE 1=1';
    const params: (string | number)[] = [];

    if (ticker) { query += ' AND ticker = ?'; params.push(ticker.toUpperCase()); }
    if (action) { query += ' AND action = ?'; params.push(action.toUpperCase()); }
    if (from) { query += ' AND date >= ?'; params.push(from); }
    if (to) { query += ' AND date <= ?'; params.push(to); }
    query += ' ORDER BY date DESC, created_at DESC';

    const trades = db.prepare(query).all(...params) as TradeRow[];

    const totalRealized = trades
      .filter(t => t.action === 'SELL' && t.realized_pnl_mxn != null)
      .reduce((sum, t) => sum + (t.realized_pnl_mxn ?? 0), 0);

    const wins = trades.filter(t => t.action === 'SELL' && (t.realized_pnl_mxn ?? 0) > 0).length;
    const sells = trades.filter(t => t.action === 'SELL').length;

    return NextResponse.json({
      trades,
      summary: {
        total_realized_pnl: totalRealized,
        total_trades: trades.length,
        win_rate: sells > 0 ? Math.round((wins / sells) * 100) : 0,
      },
    });
  } catch (err) {
    console.error('[trades GET]', err);
    return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json() as {
      ticker: string;
      name: string;
      action: 'BUY' | 'SELL';
      shares: number;
      price_mxn: number;
      date: string;
      notes?: string;
      realized_pnl_mxn?: number;
    };

    const { ticker, name, action, shares, price_mxn, date, notes, realized_pnl_mxn } = body;

    db.prepare(`
      INSERT INTO trade_log (ticker, name, action, shares, price_mxn, total_mxn, date, notes, realized_pnl_mxn)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(ticker, name, action, shares, price_mxn, shares * price_mxn, date, notes ?? null, realized_pnl_mxn ?? null);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[trades POST]', err);
    return NextResponse.json({ error: 'Failed to add trade' }, { status: 500 });
  }
}
