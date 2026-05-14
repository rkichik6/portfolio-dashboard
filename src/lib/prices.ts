import getDb from './db';
import { fetchBatchQuotes, fetchForexRate } from './finnhub';

const PRICE_TTL_MS = 5 * 60 * 1000;
const FX_TTL_MS = 15 * 60 * 1000;

export interface CachedPrice {
  ticker: string;
  price_usd: number;
  price_mxn: number;
  change_pct: number;
  updated_at: string;
  stale?: boolean;
}

function isFresh(updatedAt: string, ttlMs: number): boolean {
  return Date.now() - new Date(updatedAt).getTime() < ttlMs;
}

export async function getFxRate(): Promise<number> {
  const db = getDb();
  const cached = db.prepare(`SELECT * FROM fx_cache WHERE pair = 'USDMXN'`).get() as
    | { rate: number; updated_at: string }
    | undefined;

  if (cached && isFresh(cached.updated_at, FX_TTL_MS)) {
    return cached.rate;
  }

  const rate = await fetchForexRate();
  if (rate) {
    db.prepare(`INSERT OR REPLACE INTO fx_cache (pair, rate, updated_at) VALUES ('USDMXN', ?, datetime('now'))`).run(rate);
    return rate;
  }

  return cached?.rate ?? 17.5;
}

export async function getPrices(tickers: string[]): Promise<Record<string, CachedPrice>> {
  const db = getDb();
  const result: Record<string, CachedPrice> = {};
  const stale: string[] = [];

  for (const ticker of tickers) {
    const cached = db.prepare(`SELECT * FROM price_cache WHERE ticker = ?`).get(ticker) as CachedPrice | undefined;
    if (cached && isFresh(cached.updated_at, PRICE_TTL_MS)) {
      result[ticker] = cached;
    } else {
      stale.push(ticker);
      if (cached) result[ticker] = { ...cached, stale: true };
    }
  }

  if (stale.length > 0) {
    const fxRate = await getFxRate();
    const quotes = await fetchBatchQuotes(stale);

    for (const ticker of stale) {
      const q = quotes[ticker];
      if (!q || q.c === 0) continue;
      const price_mxn = q.c * fxRate;
      db.prepare(`
        INSERT OR REPLACE INTO price_cache (ticker, price_usd, price_mxn, change_pct, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).run(ticker, q.c, price_mxn, q.dp ?? 0);
      result[ticker] = {
        ticker,
        price_usd: q.c,
        price_mxn,
        change_pct: q.dp ?? 0,
        updated_at: new Date().toISOString(),
      };
    }
  }

  return result;
}
