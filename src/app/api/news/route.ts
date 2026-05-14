import { NextRequest, NextResponse } from 'next/server';
import { getNewsForTickers, NewsArticle } from '@/lib/news';
import getDb from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const category = (req.nextUrl.searchParams.get('category') ?? 'portfolio') as NewsArticle['category'];
    const db = getDb();

    let tickers: string[] = [];
    if (category === 'portfolio') {
      const rows = db.prepare('SELECT ticker FROM holdings').all() as { ticker: string }[];
      tickers = rows.map(r => r.ticker);
    } else if (category === 'watchlist') {
      const rows = db.prepare('SELECT ticker FROM watchlist').all() as { ticker: string }[];
      tickers = rows.map(r => r.ticker);
    } else {
      tickers = ['SPY', 'QQQ', 'NVDA', 'AMD', 'MSFT'];
    }

    const articles = await getNewsForTickers(tickers.slice(0, 6), category);
    return NextResponse.json({ articles });
  } catch (err) {
    console.error('[news]', err);
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
}
