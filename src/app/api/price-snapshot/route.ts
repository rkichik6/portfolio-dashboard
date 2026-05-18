import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import getDb from '@/lib/db';

const API_KEY = process.env.FINNHUB_API_KEY;
const BASE_URL = 'https://finnhub.io/api/v1';

interface FinnhubQuote {
  o: number; // opening price
  c: number; // current price (fallback if market hasn't opened)
}

interface SnapshotEntry {
  priceUsd: number;
  priceMxn: number;
  date: string; // YYYY-MM-DD
}

// Module-level in-memory cache — shared across requests in same process, resets on restart
const snapshotCache = new Map<string, SnapshotEntry>();

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function getFxRate(): number {
  try {
    const db = getDb();
    const row = db.prepare(`SELECT rate FROM fx_cache WHERE pair = 'USDMXN'`).get() as { rate: number } | undefined;
    return row?.rate ?? 17.5;
  } catch {
    return 17.5;
  }
}

async function quoteUsd(symbol: string): Promise<number> {
  const { data } = await axios.get<FinnhubQuote>(`${BASE_URL}/quote`, {
    params: { symbol, token: API_KEY },
    timeout: 6000,
  });
  const price = data?.o > 0 ? data.o : (data?.c > 0 ? data.c : 0);
  return price;
}

async function fetchSnapshot(ticker: string): Promise<SnapshotEntry | null> {
  const fxRate = getFxRate();

  // Try the ticker as-is first
  try {
    const priceUsd = await quoteUsd(ticker);
    if (priceUsd > 0) {
      return { priceUsd, priceMxn: priceUsd * fxRate, date: todayUtc() };
    }
  } catch { /* fall through */ }

  // If the ticker has a country suffix (.MX, .SN, .AS, .L, .RO, etc.) and
  // returned no price, strip the suffix and retry with the base US ticker.
  const dotIdx = ticker.lastIndexOf('.');
  if (dotIdx > 0) {
    const baseTicker = ticker.slice(0, dotIdx);
    try {
      const priceUsd = await quoteUsd(baseTicker);
      if (priceUsd > 0) {
        // Base price is in USD — always convert to MXN for .MX and similar
        return { priceUsd, priceMxn: priceUsd * fxRate, date: todayUtc() };
      }
    } catch { /* give up */ }
  }

  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  // Return all tickers currently in the snapshot cache
  if (searchParams.get('list') === '1') {
    return NextResponse.json({ tickers: [...snapshotCache.keys()] });
  }

  const ticker = searchParams.get('ticker')?.toUpperCase();
  if (!ticker) return NextResponse.json({ price_mxn: null, price_usd: null });

  const forceRefresh = searchParams.get('refresh') === '1';
  const today = todayUtc();

  // Serve from cache if fresh and not forcing refresh
  if (!forceRefresh) {
    const entry = snapshotCache.get(ticker);
    if (entry && entry.date === today) {
      return NextResponse.json({ price_mxn: entry.priceMxn, price_usd: entry.priceUsd });
    }
  }

  const entry = await fetchSnapshot(ticker);
  if (!entry) return NextResponse.json({ price_mxn: null, price_usd: null });

  snapshotCache.set(ticker, entry);
  return NextResponse.json({ price_mxn: entry.priceMxn, price_usd: entry.priceUsd });
}
