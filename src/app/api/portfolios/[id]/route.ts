export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const { name } = await req.json() as { name: string };
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    const db = getDb();
    db.prepare('UPDATE portfolios SET name = ? WHERE id = ?').run(name.trim(), id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[portfolios PUT]', err);
    return NextResponse.json({ error: 'Failed to rename portfolio' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const db = getDb();
    const count = (db.prepare('SELECT COUNT(*) as c FROM portfolios').get() as { c: number }).c;
    if (count <= 1) {
      return NextResponse.json({ error: 'Cannot delete the last portfolio.' }, { status: 400 });
    }
    db.transaction(() => {
      db.prepare('DELETE FROM holdings WHERE portfolio_id = ?').run(id);
      db.prepare('DELETE FROM trade_log WHERE portfolio_id = ?').run(id);
      db.prepare('DELETE FROM cash_balance WHERE portfolio_id = ?').run(id);
      db.prepare('DELETE FROM watchlist WHERE portfolio_id = ?').run(id);
      db.prepare('DELETE FROM signals WHERE portfolio_id = ?').run(id);
      db.prepare('DELETE FROM portfolios WHERE id = ?').run(id);
    })();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[portfolios DELETE]', err);
    return NextResponse.json({ error: 'Failed to delete portfolio' }, { status: 500 });
  }
}
