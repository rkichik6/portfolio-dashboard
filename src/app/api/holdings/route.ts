import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getPrices } from '@/lib/prices';
import { getPnlPct, getPnlMxn, getStopLossPrice } from '@/lib/calculations';

interface HoldingRow {
  id: number;
  ticker: string;
  name: string;
  shares: number;
  entry_price_mxn: number;
  entry_date: string;
  bucket: string;
  conviction: string;
  thesis: string | null;
  created_at: string;
  updated_at: string;
}

export async function GET() {
  try {
    const db = getDb();
    const holdings = db.prepare('SELECT * FROM holdings ORDER BY bucket, ticker').all() as HoldingRow[];
    const tickers = holdings.map(h => h.ticker);
    const prices = tickers.length > 0 ? await getPrices(tickers) : {};

    const enriched = holdings.map(h => {
      const price = prices[h.ticker];
      const currentPrice = price?.price_mxn ?? h.entry_price_mxn;
      const conviction = h.conviction as 'very-high' | 'high' | 'medium' | 'speculative';
      return {
        ...h,
        current_price_mxn: currentPrice,
        change_pct: price?.change_pct ?? 0,
        pnl_pct: getPnlPct(h.entry_price_mxn, currentPrice),
        pnl_mxn: getPnlMxn(h.entry_price_mxn, currentPrice, h.shares),
        total_value_mxn: currentPrice * h.shares,
        stop_loss_price: getStopLossPrice(h.entry_price_mxn, conviction),
        price_stale: price?.stale ?? false,
      };
    });

    return NextResponse.json(enriched);
  } catch (err) {
    console.error('[holdings GET]', err);
    return NextResponse.json({ error: 'Failed to fetch holdings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json() as {
      ticker: string;
      name: string;
      shares: number;
      entry_price_mxn: number;
      entry_date: string;
      bucket: string;
      conviction: string;
      thesis?: string;
    };

    const { ticker, name, shares, entry_price_mxn, entry_date, bucket, conviction, thesis } = body;
    const cost = shares * entry_price_mxn;

    db.transaction(() => {
      db.prepare(`
        INSERT INTO holdings (ticker, name, shares, entry_price_mxn, entry_date, bucket, conviction, thesis, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(ticker, name, shares, entry_price_mxn, entry_date, bucket, conviction, thesis ?? null);

      db.prepare(`
        INSERT INTO trade_log (ticker, name, action, shares, price_mxn, total_mxn, date, notes)
        VALUES (?, ?, 'BUY', ?, ?, ?, ?, ?)
      `).run(ticker, name, shares, entry_price_mxn, cost, entry_date, 'New position added');

      // Deduct cost from cash (only if cash has been initialized)
      db.prepare(`
        UPDATE cash_balance SET amount = amount - ?, last_updated = datetime('now')
        WHERE id = 1 AND initialized = 1
      `).run(cost);
    })();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[holdings POST]', err);
    return NextResponse.json({ error: 'Failed to add holding' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json() as {
      id: number;
      shares?: number;
      entry_price_mxn?: number;
      bucket?: string;
      conviction?: string;
      thesis?: string;
    };

    const { id, ...updates } = body;
    const fields = Object.keys(updates)
      .map(k => `${k} = ?`)
      .join(', ');
    const values = [...Object.values(updates), id];

    db.prepare(`UPDATE holdings SET ${fields}, updated_at = datetime('now') WHERE id = ?`).run(...values);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[holdings PUT]', err);
    return NextResponse.json({ error: 'Failed to update holding' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json() as {
      id: number;
      sell_price_mxn: number;
      sell_date: string;
      notes?: string;
    };

    const { id, sell_price_mxn, sell_date, notes } = body;
    const holding = db.prepare('SELECT * FROM holdings WHERE id = ?').get(id) as HoldingRow | undefined;
    if (!holding) return NextResponse.json({ error: 'Holding not found' }, { status: 404 });

    const realized_pnl = (sell_price_mxn - holding.entry_price_mxn) * holding.shares;
    const proceeds = sell_price_mxn * holding.shares;

    db.transaction(() => {
      db.prepare(`
        INSERT INTO trade_log (ticker, name, action, shares, price_mxn, total_mxn, date, notes, realized_pnl_mxn)
        VALUES (?, ?, 'SELL', ?, ?, ?, ?, ?, ?)
      `).run(
        holding.ticker, holding.name, holding.shares,
        sell_price_mxn, proceeds,
        sell_date, notes ?? null, realized_pnl
      );
      db.prepare('DELETE FROM holdings WHERE id = ?').run(id);
      db.prepare(`
        UPDATE cash_balance SET amount = amount + ?, last_updated = datetime('now') WHERE id = 1
      `).run(proceeds);
    })();

    return NextResponse.json({ success: true, realized_pnl, proceeds });
  } catch (err) {
    console.error('[holdings DELETE]', err);
    return NextResponse.json({ error: 'Failed to sell holding' }, { status: 500 });
  }
}
