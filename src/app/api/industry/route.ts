import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import getDb from '@/lib/db';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const FINNHUB = 'https://finnhub.io/api/v1';

function baseTicker(ticker: string): string {
  const dot = ticker.lastIndexOf('.');
  return dot > 0 ? ticker.slice(0, dot) : ticker;
}

export async function GET(req: NextRequest) {
  try {
    const tickersParam = req.nextUrl.searchParams.get('tickers') ?? '';
    const tickers = tickersParam.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
    if (tickers.length === 0) return NextResponse.json({});

    const db = getDb();
    const result: Record<string, string> = {};
    const needFetch: string[] = [];

    for (const ticker of tickers) {
      const row = db.prepare('SELECT industry FROM company_descriptions WHERE ticker = ?').get(ticker) as { industry: string | null } | undefined;
      if (row?.industry) {
        result[ticker] = row.industry;
      } else {
        needFetch.push(ticker);
      }
    }

    // Fetch from Finnhub for any ticker without a cached industry
    for (let i = 0; i < needFetch.length; i++) {
      const ticker = needFetch[i];
      const base = baseTicker(ticker);
      try {
        const { data } = await axios.get<{ finnhubIndustry?: string }>(`${FINNHUB}/stock/profile2`, {
          params: { symbol: base, token: FINNHUB_API_KEY },
          timeout: 5000,
        });
        const industry = data?.finnhubIndustry?.trim() || null;
        if (industry) {
          result[ticker] = industry;
          // Cache: update existing row if present, otherwise skip (row created on description generation)
          db.prepare('UPDATE company_descriptions SET industry = ? WHERE ticker = ?').run(industry, ticker);
        }
      } catch { /* no industry available — show nothing */ }

      if (i < needFetch.length - 1) await new Promise<void>(r => setTimeout(r, 150));
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('[industry GET]', err);
    return NextResponse.json({});
  }
}
