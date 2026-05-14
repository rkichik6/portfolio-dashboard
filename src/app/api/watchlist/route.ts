import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getPrices } from '@/lib/prices';

interface WatchlistRow {
  id: number;
  ticker: string;
  name: string;
  target_price_mxn: number | null;
  notes: string | null;
  created_at: string;
}

interface TagRow {
  id: number;
  name: string;
  color: string;
}

export async function GET() {
  try {
    const db = getDb();
    const items = db.prepare('SELECT * FROM watchlist ORDER BY ticker').all() as WatchlistRow[];
    const tickers = items.map(i => i.ticker);
    const prices = tickers.length > 0 ? await getPrices(tickers) : {};

    const enriched = items.map(item => {
      const price = prices[item.ticker];
      const tags = db.prepare(`
        SELECT t.* FROM tags t
        JOIN watchlist_tags wt ON wt.tag_id = t.id
        WHERE wt.watchlist_id = ?
      `).all(item.id) as TagRow[];

      const current = price?.price_mxn ?? null;
      const gapPct = item.target_price_mxn && current
        ? ((item.target_price_mxn - current) / current) * 100
        : null;

      return { ...item, current_price_mxn: current, gap_pct: gapPct, tags };
    });

    return NextResponse.json(enriched);
  } catch (err) {
    console.error('[watchlist GET]', err);
    return NextResponse.json({ error: 'Failed to fetch watchlist' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json() as {
      ticker: string;
      name: string;
      target_price_mxn?: number;
      notes?: string;
      tag_ids?: number[];
    };

    const { ticker, name, target_price_mxn, notes, tag_ids } = body;

    const result = db.prepare(`
      INSERT INTO watchlist (ticker, name, target_price_mxn, notes)
      VALUES (?, ?, ?, ?)
    `).run(ticker, name, target_price_mxn ?? null, notes ?? null);

    const watchlistId = result.lastInsertRowid;
    if (tag_ids?.length) {
      const insertTag = db.prepare(`INSERT OR IGNORE INTO watchlist_tags (watchlist_id, tag_id) VALUES (?, ?)`);
      for (const tid of tag_ids) insertTag.run(watchlistId, tid);
    }

    return NextResponse.json({ success: true, id: watchlistId });
  } catch (err) {
    console.error('[watchlist POST]', err);
    return NextResponse.json({ error: 'Failed to add watchlist item' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json() as {
      id: number;
      target_price_mxn?: number;
      notes?: string;
      tag_ids?: number[];
    };

    const { id, tag_ids, ...updates } = body;
    if (Object.keys(updates).length > 0) {
      const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
      db.prepare(`UPDATE watchlist SET ${fields} WHERE id = ?`).run(...Object.values(updates), id);
    }

    if (tag_ids !== undefined) {
      db.prepare('DELETE FROM watchlist_tags WHERE watchlist_id = ?').run(id);
      const insertTag = db.prepare(`INSERT OR IGNORE INTO watchlist_tags (watchlist_id, tag_id) VALUES (?, ?)`);
      for (const tid of tag_ids) insertTag.run(id, tid);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[watchlist PUT]', err);
    return NextResponse.json({ error: 'Failed to update watchlist item' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = getDb();
    const { id } = await req.json() as { id: number };
    db.prepare('DELETE FROM watchlist WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[watchlist DELETE]', err);
    return NextResponse.json({ error: 'Failed to delete watchlist item' }, { status: 500 });
  }
}
