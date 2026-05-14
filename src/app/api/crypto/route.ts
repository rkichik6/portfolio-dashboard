import { NextResponse } from 'next/server';
import axios from 'axios';

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

export async function GET() {
  // CoinGecko — no API key required
  try {
    const { data } = await axios.get<{
      cardano: { usd: number; usd_24h_change: number };
    }>('https://api.coingecko.com/api/v3/simple/price', {
      params: { ids: 'cardano', vs_currencies: 'usd', include_24hr_change: true },
      timeout: 8000,
    });
    const price = data?.cardano?.usd;
    const change = data?.cardano?.usd_24h_change ?? null;
    if (price && price > 0) return NextResponse.json({ price, change });
  } catch { /* fall through */ }

  // Fallback: Finnhub BINANCE:ADAUSDT
  try {
    const { data } = await axios.get<{ c: number; dp: number }>(
      'https://finnhub.io/api/v1/quote',
      { params: { symbol: 'BINANCE:ADAUSDT', token: FINNHUB_KEY }, timeout: 5000 }
    );
    if (data?.c && data.c > 0) {
      return NextResponse.json({ price: data.c, change: data.dp ?? null });
    }
  } catch { /* fall through */ }

  return NextResponse.json({ price: null, change: null });
}
