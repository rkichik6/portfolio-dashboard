import { NextResponse } from 'next/server';
import axios from 'axios';

const API_KEY = process.env.FINNHUB_API_KEY;
const BASE_URL = 'https://finnhub.io/api/v1';

export async function GET(request: Request) {
  const symbol = new URL(request.url).searchParams.get('symbol');
  if (!symbol) return NextResponse.json({ description: null });

  try {
    const { data } = await axios.get<{ description?: string }>(
      `${BASE_URL}/stock/profile2`,
      { params: { symbol, token: API_KEY }, timeout: 6000 }
    );
    const desc = data?.description?.trim() || null;
    return NextResponse.json({ description: desc });
  } catch {
    return NextResponse.json({ description: null });
  }
}
