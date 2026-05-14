import { NextResponse } from 'next/server';
import axios from 'axios';

const API_KEY = process.env.FINNHUB_API_KEY;
const ALLOWED_TYPES = new Set(['Common Stock', 'ETP']);

interface FinnhubResult {
  description: string;
  displaySymbol: string;
  symbol: string;
  type: string;
}

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q') ?? '';
  if (q.length < 2) return NextResponse.json({ results: [] });

  try {
    const { data } = await axios.get<{ count: number; result: FinnhubResult[] }>(
      'https://finnhub.io/api/v1/search',
      { params: { q, token: API_KEY }, timeout: 5000 }
    );
    const results = (data.result ?? [])
      .filter(r => ALLOWED_TYPES.has(r.type))
      .slice(0, 12);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
