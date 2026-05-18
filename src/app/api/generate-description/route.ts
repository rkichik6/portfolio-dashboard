import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import getDb from '@/lib/db';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const FINNHUB = 'https://finnhub.io/api/v1';
const TOMBSTONE = '—';

interface AnthropicResponse {
  content?: { type: string; text: string }[];
}

interface Profile2 {
  name?: string;
  finnhubIndustry?: string;
  country?: string;
}

interface NewsItem {
  headline?: string;
}

function baseTicker(ticker: string): string {
  const dot = ticker.lastIndexOf('.');
  return dot > 0 ? ticker.slice(0, dot) : ticker;
}

export async function POST(req: NextRequest) {
  try {
    const { ticker, name: nameHint } = await req.json() as { ticker: string; name?: string };
    if (!ticker) return NextResponse.json({ description: null });

    const db = getDb();

    const cached = db.prepare('SELECT description, industry FROM company_descriptions WHERE ticker = ?').get(ticker) as { description: string; industry: string | null } | undefined;
    if (cached) {
      console.log(`[gen-desc] ${ticker}: served from cache ("${cached.description.slice(0, 40)}...")`);
      return NextResponse.json({ description: cached.description === TOMBSTONE ? null : cached.description });
    }

    const base = baseTicker(ticker);
    console.log(`[gen-desc] ${ticker}: starting generation (base ticker: ${base})`);

    // Step 1 — Finnhub profile2
    let profile: Profile2 = {};
    try {
      const { data } = await axios.get<Profile2>(`${FINNHUB}/stock/profile2`, {
        params: { symbol: base, token: FINNHUB_API_KEY },
        timeout: 6000,
      });
      profile = data ?? {};
      console.log(`[gen-desc] ${ticker}: Finnhub profile2 response:`, JSON.stringify(profile));
    } catch (err) {
      console.error(`[gen-desc] ${ticker}: Finnhub profile2 FAILED:`, err);
    }

    // Step 2 — Recent news headlines (up to 3)
    let headlines: string[] = [];
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await axios.get<NewsItem[]>(`${FINNHUB}/company-news`, {
        params: { symbol: base, from: '2025-01-01', to: today, token: FINNHUB_API_KEY },
        timeout: 6000,
      });
      if (Array.isArray(data)) {
        headlines = data.slice(0, 3).map(n => n.headline ?? '').filter(Boolean);
      }
      console.log(`[gen-desc] ${ticker}: Finnhub news headlines (${headlines.length}):`, headlines);
    } catch (err) {
      console.error(`[gen-desc] ${ticker}: Finnhub news FAILED:`, err);
    }

    const companyName = profile.name || nameHint || base;
    const industry = profile.finnhubIndustry?.trim() || null;

    if (!profile.name && !profile.finnhubIndustry && !nameHint && headlines.length === 0) {
      console.log(`[gen-desc] ${ticker}: no Finnhub data at all — storing tombstone`);
      db.prepare(`INSERT OR REPLACE INTO company_descriptions (ticker, description, industry, generated_at) VALUES (?, ?, ?, datetime('now'))`).run(ticker, TOMBSTONE, null);
      return NextResponse.json({ description: null });
    }

    if (!ANTHROPIC_API_KEY) {
      console.error(`[gen-desc] ${ticker}: ANTHROPIC_API_KEY is missing`);
      db.prepare(`INSERT OR REPLACE INTO company_descriptions (ticker, description, industry, generated_at) VALUES (?, ?, ?, datetime('now'))`).run(ticker, TOMBSTONE, industry);
      return NextResponse.json({ description: null });
    }

    // Step 3 — Build prompt
    const headlineBlock = headlines.length > 0
      ? headlines.map((h, i) => `  ${i + 1}. ${h}`).join('\n')
      : '  (no recent news available)';

    const prompt = `You are a financial analyst. Based on the following data, write exactly 2 concise sentences describing this company for an investor. Cover what the company does, its core market or customers, and one differentiator. Be factual and direct. No disclaimers, no caveats, no refusals.

Company data:
- Ticker: ${ticker}
- Name: ${companyName}
- Industry: ${industry || 'N/A'}
- Country: ${profile.country || 'N/A'}
- Recent news headlines:
${headlineBlock}

Write exactly 2 sentences. Start directly with what the company does.`;

    console.log(`[gen-desc] ${ticker}: sending prompt to Claude (${prompt.length} chars)`);

    // Step 4 — Call Claude with retries
    let description: string | null = null;
    for (let attempt = 0; attempt < 3 && !description; attempt++) {
      try {
        const { data } = await axios.post<AnthropicResponse>(
          'https://api.anthropic.com/v1/messages',
          {
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 150,
            messages: [{ role: 'user', content: prompt }],
          },
          {
            headers: {
              'x-api-key': ANTHROPIC_API_KEY,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
            timeout: 15000,
          }
        );
        console.log(`[gen-desc] ${ticker}: Claude raw response (attempt ${attempt + 1}):`, JSON.stringify(data));
        description = data?.content?.[0]?.text?.trim() || null;
      } catch (err) {
        console.error(`[gen-desc] ${ticker}: Claude attempt ${attempt + 1} FAILED:`, err);
        if (attempt < 2) await new Promise(r => setTimeout(r, 500));
      }
    }

    const stored = description ?? TOMBSTONE;
    db.prepare(`INSERT OR REPLACE INTO company_descriptions (ticker, description, industry, generated_at) VALUES (?, ?, ?, datetime('now'))`).run(ticker, stored, industry);
    console.log(`[gen-desc] ${ticker}: stored description="${stored.slice(0, 60)}..." industry="${industry}"`);
    return NextResponse.json({ description });

  } catch (err) {
    console.error('[generate-description] unhandled error:', err);
    return NextResponse.json({ description: null });
  }
}
