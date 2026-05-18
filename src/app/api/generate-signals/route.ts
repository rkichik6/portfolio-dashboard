export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import getDb from '@/lib/db';
import { fetchCompanyNews } from '@/lib/finnhub';
import { format, subDays } from 'date-fns';
import type { Signal } from '@/app/api/signals/route';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

interface HoldingInput {
  ticker: string;
  name: string;
  bucket: string;
  entry_price_mxn: number;
  current_price_mxn: number;
  pnl_pct: number;
  change_pct: number;
  stop_loss_price: number;
  conviction: string;
  type: 'holding';
}

interface WatchlistInput {
  ticker: string;
  name: string;
  current_price_mxn: number | null;
  target_price_mxn: number | null;
  gap_pct: number | null;
  type: 'watchlist';
}

interface GenerateRequest {
  holdings: HoldingInput[];
  watchlist: WatchlistInput[];
  portfolio_total_mxn: number;
  portfolio_cash_mxn: number;
  portfolio_id?: number;
  force_all?: boolean;
}

interface AnthropicResponse {
  content?: { type: string; text: string }[];
}

interface SignalPayload {
  signal_direction: string;
  signal_strength: number;
  sentiment: string;
  sentiment_strength: number;
  reasoning: string;
}

function baseTicker(ticker: string): string {
  const dot = ticker.lastIndexOf('.');
  return dot > 0 ? ticker.slice(0, dot) : ticker;
}

function buildHoldingPrompt(
  h: HoldingInput,
  industry: string | null,
  headlines: string[],
  portfolioTotal: number,
  cash: number,
  positionCount: number
): string {
  const stopDist = h.current_price_mxn > 0
    ? ((h.current_price_mxn - h.stop_loss_price) / h.current_price_mxn) * 100
    : 0;
  const headlineBlock = headlines.length > 0
    ? headlines.map((hl, i) => `${i + 1}. ${hl}`).join('\n')
    : '(no recent news)';

  return `Analyze this position and return a JSON signal.

Ticker: ${h.ticker}
Company: ${h.name}
Industry: ${industry ?? 'N/A'}
Bucket: ${h.bucket.toUpperCase()}
Entry Price: ${h.entry_price_mxn.toFixed(2)} MXN
Current Price: ${h.current_price_mxn.toFixed(2)} MXN
Unrealized P&L: ${h.pnl_pct.toFixed(2)}%
Day Change: ${h.change_pct.toFixed(2)}%
Stop Loss Distance: ${stopDist.toFixed(2)}%
Conviction level set by user: ${h.conviction}

Portfolio context:
- ${positionCount} open positions
- Total value: ${portfolioTotal.toFixed(0)} MXN
- Cash: ${cash.toFixed(0)} MXN

Recent news headlines:
${headlineBlock}

Return exactly this JSON:
{
  "signal_direction": "BUY" | "LEAN_BUY" | "NEUTRAL" | "LEAN_SELL" | "SELL",
  "signal_strength": <0-100>,
  "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE",
  "sentiment_strength": <0-100>,
  "reasoning": "<max 20 words>"
}`;
}

function buildWatchlistPrompt(
  w: WatchlistInput,
  industry: string | null,
  headlines: string[]
): string {
  const headlineBlock = headlines.length > 0
    ? headlines.map((hl, i) => `${i + 1}. ${hl}`).join('\n')
    : '(no recent news)';

  return `Analyze this watchlist candidate and return a JSON signal.

Ticker: ${w.ticker}
Company: ${w.name}
Industry: ${industry ?? 'N/A'}
Current Price: ${w.current_price_mxn != null ? w.current_price_mxn.toFixed(2) + ' MXN' : 'N/A'}
Target Price: ${w.target_price_mxn != null ? w.target_price_mxn.toFixed(2) + ' MXN' : 'N/A'}
Gap to Target: ${w.gap_pct != null ? w.gap_pct.toFixed(2) + '%' : 'N/A'}
Status: Watchlist — not yet purchased

Recent news headlines:
${headlineBlock}

Return exactly this JSON:
{
  "signal_direction": "BUY" | "LEAN_BUY" | "NEUTRAL" | "LEAN_SELL" | "SELL",
  "signal_strength": <0-100>,
  "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE",
  "sentiment_strength": <0-100>,
  "reasoning": "<max 20 words>"
}`;
}

async function callClaude(prompt: string): Promise<SignalPayload | null> {
  if (!ANTHROPIC_API_KEY) return null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data } = await axios.post<AnthropicResponse>(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-sonnet-4-6',
          max_tokens: 250,
          system: 'You are a concise stock analyst. Respond only with valid JSON. No prose.',
          messages: [{ role: 'user', content: prompt }],
        },
        {
          headers: {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          timeout: 25000,
        }
      );

      const text = data?.content?.[0]?.text?.trim();
      if (!text) continue;

      const match = text.match(/\{[\s\S]*\}/);
      if (!match) continue;

      const parsed = JSON.parse(match[0]) as SignalPayload;

      const validDirections = ['BUY', 'LEAN_BUY', 'NEUTRAL', 'LEAN_SELL', 'SELL'];
      const validSentiments = ['POSITIVE', 'NEUTRAL', 'NEGATIVE'];
      if (!validDirections.includes(parsed.signal_direction)) continue;
      if (!validSentiments.includes(parsed.sentiment)) continue;

      return {
        signal_direction: parsed.signal_direction,
        signal_strength: Math.max(0, Math.min(100, Math.round(parsed.signal_strength ?? 50))),
        sentiment: parsed.sentiment,
        sentiment_strength: Math.max(0, Math.min(100, Math.round(parsed.sentiment_strength ?? 50))),
        reasoning: String(parsed.reasoning ?? '').slice(0, 120),
      };
    } catch (err) {
      console.error(`[generate-signals] Claude attempt ${attempt + 1} failed:`, err);
      if (attempt < 2) await sleep(500);
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as GenerateRequest;
    const {
      holdings = [],
      watchlist = [],
      portfolio_total_mxn = 0,
      portfolio_cash_mxn = 0,
      portfolio_id = 1,
      force_all = false,
    } = body;
    const portfolioId = portfolio_id;

    const db = getDb();
    const today = format(new Date(), 'yyyy-MM-dd');
    const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');

    type Item =
      | { kind: 'holding'; data: HoldingInput }
      | { kind: 'watchlist'; data: WatchlistInput };

    const allItems: Item[] = [
      ...holdings.map(h => ({ kind: 'holding' as const, data: h })),
      ...watchlist.map(w => ({ kind: 'watchlist' as const, data: w })),
    ];

    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i];
      const ticker = item.data.ticker;

      if (!force_all) {
        const existing = db.prepare('SELECT ticker FROM signals WHERE ticker = ? AND portfolio_id = ?').get(ticker, portfolioId);
        if (existing) continue;
      }

      // Look up cached industry from company_descriptions
      const descRow = db.prepare('SELECT industry FROM company_descriptions WHERE ticker = ?').get(ticker) as { industry: string | null } | undefined;
      const industry = descRow?.industry ?? null;

      // Fetch news headlines
      let headlines: string[] = [];
      try {
        const news = await fetchCompanyNews(baseTicker(ticker), weekAgo, today);
        headlines = news.slice(0, 3).map(n => n.headline).filter(Boolean);
      } catch { /* silent */ }

      // Build prompt
      let prompt: string;
      if (item.kind === 'holding') {
        prompt = buildHoldingPrompt(
          item.data,
          industry,
          headlines,
          portfolio_total_mxn,
          portfolio_cash_mxn,
          holdings.length
        );
      } else {
        prompt = buildWatchlistPrompt(item.data, industry, headlines);
      }

      // Call Claude
      const result = await callClaude(prompt);
      if (result) {
        db.prepare(`
          INSERT OR REPLACE INTO signals
            (ticker, portfolio_id, signal_direction, signal_strength, sentiment, sentiment_strength, reasoning, generated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(
          ticker,
          portfolioId,
          result.signal_direction,
          result.signal_strength,
          result.sentiment,
          result.sentiment_strength,
          result.reasoning
        );
        console.log(`[generate-signals] ${ticker}: ${result.signal_direction}(${result.signal_strength}) / ${result.sentiment}(${result.sentiment_strength})`);
      }

      if (i < allItems.length - 1) await sleep(500);
    }

    // Return full signals table for this portfolio
    const rows = db.prepare('SELECT * FROM signals WHERE portfolio_id = ?').all(portfolioId) as Signal[];
    const signals: Record<string, Signal> = {};
    for (const row of rows) signals[row.ticker] = row;

    return NextResponse.json({ signals });
  } catch (err) {
    console.error('[generate-signals] unhandled error:', err);
    return NextResponse.json({ error: 'Signal generation failed' }, { status: 500 });
  }
}
