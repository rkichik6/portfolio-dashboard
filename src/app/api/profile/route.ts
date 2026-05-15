import { NextResponse } from 'next/server';
import axios from 'axios';

const API_KEY = process.env.FINNHUB_API_KEY;
const BASE_URL = 'https://finnhub.io/api/v1';

export async function GET(request: Request) {
  const symbol = new URL(request.url).searchParams.get('symbol');
  if (!symbol) return NextResponse.json({ description: null });

  // Step 1: Finnhub profile2 — get company name (and check if description ever appears)
  let companyName: string | null = null;
  try {
    const { data } = await axios.get<Record<string, unknown>>(
      `${BASE_URL}/stock/profile2`,
      { params: { symbol, token: API_KEY }, timeout: 6000 }
    );
    console.log(`[profile] Finnhub profile2 fields for ${symbol}:`, Object.keys(data));
    const finnhubDesc = (data?.description as string | undefined)?.trim() || null;
    if (finnhubDesc) return NextResponse.json({ description: finnhubDesc });
    companyName = (data?.name as string | undefined) || null;
    console.log(`[profile] company name for ${symbol}: ${companyName}`);
  } catch (err) {
    console.error(`[profile] Finnhub error for ${symbol}:`, err);
  }

  // Step 2: Wikipedia page summary using company name
  if (companyName) {
    try {
      const { data } = await axios.get<{ extract?: string }>(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(companyName)}`,
        {
          headers: { 'User-Agent': 'portfolio-dashboard/1.0' },
          timeout: 6000,
        }
      );
      const desc = data?.extract?.trim() || null;
      if (desc) {
        console.log(`[profile] Wikipedia description found for ${symbol} (${desc.length} chars)`);
        return NextResponse.json({ description: desc });
      }
    } catch (err) {
      console.error(`[profile] Wikipedia error for ${symbol}:`, err);
    }
  }

  return NextResponse.json({ description: null });
}
