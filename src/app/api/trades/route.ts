export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { recalculateHolding } from '@/lib/recalculate';

interface TradeRow {
  id: number;
  portfolio_id: number;
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
  deleted: number;
  deleted_at: string | null;
}

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const portfolioId = parseInt(req.nextUrl.searchParams.get('portfolio_id') ?? '1') || 1;
    const ticker = req.nextUrl.searchParams.get('ticker');
    const action = req.nextUrl.searchParams.get('action');
    const from = req.nextUrl.searchParams.get('from');
    const to = req.nextUrl.searchParams.get('to');
    const showDeleted = req.nextUrl.searchParams.get('showDeleted') === '1';

    let query = showDeleted
      ? 'SELECT * FROM trade_log WHERE portfolio_id = ?'
      : 'SELECT * FROM trade_log WHERE portfolio_id = ? AND deleted = 0';
    const params: (string | number)[] = [portfolioId];

    if (ticker) { query += ' AND ticker = ?'; params.push(ticker.toUpperCase()); }
    if (action) { query += ' AND action = ?'; params.push(action.toUpperCase()); }
    if (from)   { query += ' AND date >= ?';  params.push(from); }
    if (to)     { query += ' AND date <= ?';  params.push(to); }
    query += ' ORDER BY date DESC, created_at DESC';

    const trades = db.prepare(query).all(...params) as TradeRow[];

    const active = trades.filter(t => !t.deleted);
    const totalRealized = active
      .filter(t => t.action === 'SELL' && t.realized_pnl_mxn != null)
      .reduce((sum, t) => sum + (t.realized_pnl_mxn ?? 0), 0);
    const wins = active.filter(t => t.action === 'SELL' && (t.realized_pnl_mxn ?? 0) > 0).length;
    const sells = active.filter(t => t.action === 'SELL').length;

    return NextResponse.json({
      trades,
      summary: {
        total_realized_pnl: totalRealized,
        total_trades: active.length,
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
      portfolio_id?: number;
      ticker: string; name: string; action: 'BUY' | 'SELL';
      shares: number; price_mxn: number; date: string;
      notes?: string; realized_pnl_mxn?: number;
    };
    const portfolioId = body.portfolio_id ?? 1;
    const { ticker, name, action, shares, price_mxn, date, notes, realized_pnl_mxn } = body;
    db.prepare(`
      INSERT INTO trade_log (portfolio_id, ticker, name, action, shares, price_mxn, total_mxn, date, notes, realized_pnl_mxn)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(portfolioId, ticker, name, action, shares, price_mxn, shares * price_mxn, date, notes ?? null, realized_pnl_mxn ?? null);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[trades POST]', err);
    return NextResponse.json({ error: 'Failed to add trade' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json() as {
      id: number; ticker: string; name: string; action: 'BUY' | 'SELL';
      shares: number; price_mxn: number; date: string; notes?: string;
    };
    const { id, ticker, name, action, shares, price_mxn, date, notes } = body;
    const newTotal = shares * price_mxn;

    const old = db.prepare('SELECT * FROM trade_log WHERE id = ?').get(id) as TradeRow | undefined;
    if (!old) return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    if (old.deleted) return NextResponse.json({ error: 'Cannot edit a deleted trade. Restore it first.' }, { status: 400 });

    const oldSign = old.action === 'BUY' ? -1 : 1;
    const newSign = action === 'BUY' ? -1 : 1;
    const cashDelta = (-oldSign * old.total_mxn) + (newSign * newTotal);

    try {
      db.transaction(() => {
        db.prepare(`
          UPDATE trade_log SET ticker = ?, name = ?, action = ?, shares = ?,
          price_mxn = ?, total_mxn = ?, date = ?, notes = ? WHERE id = ?
        `).run(ticker, name, action, shares, price_mxn, newTotal, date, notes ?? null, id);

        db.prepare(
          `UPDATE cash_balance SET amount = amount + ?, last_updated = datetime('now') WHERE portfolio_id = ?`
        ).run(cashDelta, old.portfolio_id);

        recalculateHolding(db, old.ticker, old.portfolio_id);
        if (ticker.toUpperCase() !== old.ticker.toUpperCase()) {
          recalculateHolding(db, ticker.toUpperCase(), old.portfolio_id);
        }
      })();
    } catch (err) {
      if (err instanceof Error && err.message === 'NEGATIVE_POSITION') {
        return NextResponse.json({ error: 'This edit would result in a negative position quantity. Adjust the trade values and try again.' }, { status: 422 });
      }
      throw err;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[trades PUT]', err);
    return NextResponse.json({ error: 'Failed to update trade' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = getDb();
    const { id } = await req.json() as { id: number };

    const trade = db.prepare('SELECT * FROM trade_log WHERE id = ?').get(id) as TradeRow | undefined;
    if (!trade) return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    if (trade.deleted) return NextResponse.json({ error: 'Trade is already deleted.' }, { status: 400 });

    const cashDelta = trade.action === 'BUY' ? trade.total_mxn : -trade.total_mxn;

    try {
      db.transaction(() => {
        db.prepare(
          `UPDATE trade_log SET deleted = 1, deleted_at = datetime('now') WHERE id = ?`
        ).run(id);
        db.prepare(
          `UPDATE cash_balance SET amount = amount + ?, last_updated = datetime('now') WHERE portfolio_id = ?`
        ).run(cashDelta, trade.portfolio_id);
        recalculateHolding(db, trade.ticker, trade.portfolio_id);
      })();
    } catch (err) {
      if (err instanceof Error && err.message === 'NEGATIVE_POSITION') {
        return NextResponse.json({ error: 'Deleting this trade would result in a negative position quantity. Check your trade history first.' }, { status: 422 });
      }
      throw err;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[trades DELETE]', err);
    return NextResponse.json({ error: 'Failed to delete trade' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = getDb();
    const { id } = await req.json() as { id: number };

    const trade = db.prepare('SELECT * FROM trade_log WHERE id = ?').get(id) as TradeRow | undefined;
    if (!trade) return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    if (!trade.deleted) return NextResponse.json({ error: 'Trade is not deleted.' }, { status: 400 });

    const cashDelta = trade.action === 'BUY' ? -trade.total_mxn : trade.total_mxn;

    try {
      db.transaction(() => {
        db.prepare(
          `UPDATE trade_log SET deleted = 0, deleted_at = NULL WHERE id = ?`
        ).run(id);
        db.prepare(
          `UPDATE cash_balance SET amount = amount + ?, last_updated = datetime('now') WHERE portfolio_id = ?`
        ).run(cashDelta, trade.portfolio_id);
        recalculateHolding(db, trade.ticker, trade.portfolio_id);
      })();
    } catch (err) {
      if (err instanceof Error && err.message === 'NEGATIVE_POSITION') {
        return NextResponse.json({ error: 'Restoring this trade would result in a negative position quantity. Restore other trades first to fix the sequence.' }, { status: 422 });
      }
      throw err;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[trades PATCH]', err);
    return NextResponse.json({ error: 'Failed to restore trade' }, { status: 500 });
  }
}
