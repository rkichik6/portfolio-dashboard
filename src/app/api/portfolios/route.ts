export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

interface PortfolioRow {
  id: number;
  name: string;
  created_at: string;
}

export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM portfolios ORDER BY id').all() as PortfolioRow[];
    return NextResponse.json(rows);
  } catch (err) {
    console.error('[portfolios GET]', err);
    return NextResponse.json({ error: 'Failed to fetch portfolios' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json() as { name: string };
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    const db = getDb();
    const id = db.transaction(() => {
      const r = db.prepare('INSERT INTO portfolios (name) VALUES (?)').run(name.trim());
      const pid = Number(r.lastInsertRowid);
      db.prepare('INSERT INTO cash_balance (portfolio_id, amount, initialized) VALUES (?, 0, 0)').run(pid);
      return pid;
    })();
    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error('[portfolios POST]', err);
    return NextResponse.json({ error: 'Failed to create portfolio' }, { status: 500 });
  }
}
