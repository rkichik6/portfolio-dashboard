import axios from 'axios';

const API_KEY = process.env.FINNHUB_API_KEY;
const BASE_URL = 'https://finnhub.io/api/v1';

export interface FinnhubQuote {
  c: number;  // current price
  d: number;  // change
  dp: number; // change percent
  h: number;  // high
  l: number;  // low
  o: number;  // open
  pc: number; // previous close
}

export interface FinnhubNewsItem {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

export interface FinnhubForexRates {
  base: string;
  quote: Record<string, number>;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function fetchQuote(ticker: string): Promise<FinnhubQuote | null> {
  try {
    const { data } = await axios.get<FinnhubQuote>(`${BASE_URL}/quote`, {
      params: { symbol: ticker, token: API_KEY },
      timeout: 5000,
    });
    return data;
  } catch {
    return null;
  }
}

export async function fetchBatchQuotes(
  tickers: string[],
  onProgress?: (ticker: string) => void
): Promise<Record<string, FinnhubQuote | null>> {
  const results: Record<string, FinnhubQuote | null> = {};
  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];
    results[ticker] = await fetchQuote(ticker);
    if (onProgress) onProgress(ticker);
    if (i < tickers.length - 1) await sleep(200);
  }
  return results;
}

export async function fetchCompanyNews(
  ticker: string,
  fromDate: string,
  toDate: string
): Promise<FinnhubNewsItem[]> {
  try {
    const { data } = await axios.get<FinnhubNewsItem[]>(`${BASE_URL}/company-news`, {
      params: { symbol: ticker, from: fromDate, to: toDate, token: API_KEY },
      timeout: 5000,
    });
    return Array.isArray(data) ? data.slice(0, 5) : [];
  } catch {
    return [];
  }
}

export async function fetchForexRate(): Promise<number | null> {
  // Try Finnhub OANDA quote (works on free tier)
  try {
    const { data } = await axios.get<FinnhubQuote>(`${BASE_URL}/quote`, {
      params: { symbol: 'OANDA:USD_MXN', token: API_KEY },
      timeout: 5000,
    });
    if (data?.c && data.c > 5) return data.c;
  } catch { /* fall through */ }

  // Fallback: Frankfurter (no API key required)
  try {
    const { data } = await axios.get<{ rates: Record<string, number> }>(
      'https://api.frankfurter.app/latest',
      { params: { from: 'USD', to: 'MXN' }, timeout: 8000 }
    );
    if (data?.rates?.MXN) return data.rates.MXN;
  } catch { /* fall through */ }

  return null;
}

export async function fetchCompanyProfile(ticker: string): Promise<{ name: string } | null> {
  try {
    const { data } = await axios.get<{ name: string }>(`${BASE_URL}/stock/profile2`, {
      params: { symbol: ticker, token: API_KEY },
      timeout: 5000,
    });
    return data?.name ? { name: data.name } : null;
  } catch {
    return null;
  }
}
