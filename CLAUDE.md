# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Commands

```bash
npm run dev      # start Next.js dev server (http://localhost:3000)
npm run build    # production build
npm run start    # start production server
npm run lint     # run ESLint
```

No test suite exists. Verify behavior by running the dev server.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.6, App Router, TypeScript 5 |
| Database | better-sqlite3 12.10.0 — synchronous SQLite, local file `portfolio.db` in project root |
| Styling | Tailwind CSS 4 + CSS custom properties in `src/app/globals.css` |
| Font | IBM Plex Mono (Google Fonts) — the **only** font used anywhere |
| Icons | lucide-react 1.16.0 |
| Charts | recharts 3.8.1 (treemap) |
| HTTP | axios 1.16.1 (server-side API calls only) |

**External APIs** (all called server-side only, never from client components):

| API | Purpose | Auth |
|---|---|---|
| Finnhub | Quotes, news, forex (OANDA:USD_MXN), company profile | `FINNHUB_API_KEY` in `.env.local` |
| CoinGecko | ADA/USD price and 24h change | No key required |
| Anthropic | Claude Haiku (descriptions), Claude Sonnet 4.6 (signals) | `ANTHROPIC_API_KEY` in `.env.local` |
| Frankfurter | USD/MXN fallback if Finnhub forex fails | No key required |

**Rate limit**: Finnhub free tier = 60 calls/min. `fetchBatchQuotes` in `src/lib/finnhub.ts` enforces sequential calls with 200ms sleep between each.

---

## Architecture Overview

### Multi-Portfolio System

The central state is `activePortfolioId` (integer, defaults to 1), stored in `PortfolioContext` (`src/context/PortfolioContext.tsx`). It is provided at the layout level (`src/app/layout.tsx`) via `<PortfolioProvider>`, so all pages and components can access it via `usePortfolio()`.

**Every** API route that touches portfolio data accepts `portfolio_id` as a query param (GET) or body field (POST/PUT). Every DB query on portfolio-scoped tables includes `WHERE portfolio_id = ?`.

When the active portfolio changes, `src/app/page.tsx` resets holdings, signals, and loading state via a dedicated `useEffect([activePortfolioId])` before re-fetching.

### Request → DB Pattern

All external API calls happen in `/app/api/` routes. Client components fetch from these routes. No external API is ever called from a client component. The DB singleton is created in `src/lib/db.ts` via `getDb()` and reused across the process lifetime (WAL mode, foreign keys ON).

### Trade → Position Cascade

`src/lib/recalculate.ts` exports `recalculateHolding(db, ticker, portfolioId)`. This is the single source of truth for position state. It:
1. Fetches all non-deleted BUY and SELL trades for the ticker+portfolio in chronological order
2. Walks through them computing a running weighted-average cost basis and share count
3. If net shares ≤ 0.0001 → deletes the holding row
4. Otherwise → updates (or inserts) the holding with the computed shares and avg entry price
5. Throws `'NEGATIVE_POSITION'` if any intermediate state goes negative

This function is called from `src/app/api/buy/route.ts`, `src/app/api/sell/route.ts`, and all handlers in `src/app/api/trades/route.ts` (PUT/DELETE/PATCH). It must always run inside a transaction.

---

## Database Schema

### Portfolio-scoped tables (always filter by `portfolio_id`)

**portfolios**
```
id INTEGER PRIMARY KEY AUTOINCREMENT
name TEXT NOT NULL
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

**holdings**
```
id INTEGER PRIMARY KEY AUTOINCREMENT
portfolio_id INTEGER NOT NULL DEFAULT 1
ticker TEXT NOT NULL
name TEXT NOT NULL
shares REAL NOT NULL
entry_price_mxn REAL NOT NULL   -- weighted average, recalculated from trade history
entry_date TEXT NOT NULL
bucket TEXT NOT NULL DEFAULT 'core'   -- 'core' | 'swing'
conviction TEXT NOT NULL DEFAULT 'high'   -- 'very-high' | 'high' | 'medium' | 'speculative'
thesis TEXT
created_at TEXT
updated_at TEXT
UNIQUE(portfolio_id, ticker)
```

**trade_log**
```
id INTEGER PRIMARY KEY AUTOINCREMENT
portfolio_id INTEGER NOT NULL DEFAULT 1
ticker TEXT NOT NULL
name TEXT NOT NULL
action TEXT NOT NULL CHECK(action IN ('BUY','SELL'))
shares REAL NOT NULL
price_mxn REAL NOT NULL
total_mxn REAL NOT NULL
date TEXT NOT NULL
notes TEXT
realized_pnl_mxn REAL
created_at TEXT
deleted INTEGER NOT NULL DEFAULT 0     -- soft delete flag
deleted_at TEXT                         -- set on soft delete, NULL on restore
```

**cash_balance**
```
portfolio_id INTEGER PRIMARY KEY
amount REAL NOT NULL DEFAULT 0
initialized INTEGER NOT NULL DEFAULT 0   -- 0 = not set yet, 1 = set
last_updated TEXT
```

**watchlist**
```
id INTEGER PRIMARY KEY AUTOINCREMENT
portfolio_id INTEGER NOT NULL DEFAULT 1
ticker TEXT NOT NULL
name TEXT NOT NULL
target_price_mxn REAL
notes TEXT
created_at TEXT
UNIQUE(portfolio_id, ticker)
```

**watchlist_tags** (join table)
```
watchlist_id INTEGER REFERENCES watchlist(id) ON DELETE CASCADE
tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE
PRIMARY KEY (watchlist_id, tag_id)
```

**signals**
```
ticker TEXT NOT NULL
portfolio_id INTEGER NOT NULL DEFAULT 1
signal_direction TEXT NOT NULL   -- 'BUY'|'LEAN_BUY'|'NEUTRAL'|'LEAN_SELL'|'SELL'
signal_strength INTEGER NOT NULL   -- 0–100
sentiment TEXT NOT NULL   -- 'POSITIVE'|'NEUTRAL'|'NEGATIVE'
sentiment_strength INTEGER NOT NULL   -- 0–100
reasoning TEXT
generated_at DATETIME
PRIMARY KEY (ticker, portfolio_id)
```

### Shared tables (no portfolio_id — global across all portfolios)

**price_cache** — `ticker PK`, `price_usd`, `price_mxn`, `change_pct`, `updated_at` (TTL 5 min)

**fx_cache** — `pair PK` (`'USDMXN'`), `rate`, `updated_at` (TTL 15 min)

**company_descriptions** — `ticker PK`, `description`, `industry`, `generated_at` (never regenerated once stored)

**tags** — `id PK`, `name UNIQUE`, `color` (hex string)

---

## API Routes

All live-data routes have `export const dynamic = 'force-dynamic'` at the top.

Dynamic route params in Next.js 15+ are typed as `Promise<{ id: string }>` and require `await params`.

| Route | Methods | Notes |
|---|---|---|
| `/api/portfolios` | GET, POST | GET returns all portfolios ordered by id. POST creates portfolio + inserts empty cash_balance row in one transaction. |
| `/api/portfolios/[id]` | PUT, DELETE | PUT renames. DELETE cascades all portfolio data; blocks if only one portfolio exists. |
| `/api/holdings` | GET, POST, PUT, DELETE | GET fetches live Finnhub prices + FX, stores in price_cache, falls back to cache. POST inserts holding + BUY trade + deducts cash in one transaction. PUT updates metadata fields (no cascade needed). DELETE is a full sell — inserts SELL trade, credits cash, removes holding row. All scoped by `?portfolio_id=`. |
| `/api/buy` | POST | BUY flow: inserts trade_log entry, deducts cash (if initialized), then either updates metadata + calls recalculateHolding (existing ticker) or inserts holding directly (new ticker). Body: `{ portfolio_id, ticker, name, shares, price_mxn, date, bucket, conviction, thesis }`. |
| `/api/sell` | POST | Validates shares ≤ held quantity. Inserts SELL trade, credits cash, calls recalculateHolding (removes holding if net = 0). Body: `{ portfolio_id, ticker, shares, price_mxn, date, notes }`. |
| `/api/trades` | GET, POST, PUT, DELETE, PATCH | GET accepts `portfolio_id`, `ticker`, `action`, `from`, `to`, `showDeleted` query params; returns trades + summary stats. PUT edits a trade (adjusts cash delta + recalculates). DELETE soft-deletes (reverses cash + recalculates). PATCH restores (re-applies cash + recalculates). |
| `/api/cash` | GET, PUT | Both use `?portfolio_id=`. GET returns current balance. PUT UPSERTS; on first set (`initialized=0`), automatically deducts existing holdings cost from the entered amount. |
| `/api/watchlist` | GET, POST, PUT, DELETE | GET filters by `?portfolio_id=`; enriches with live prices, tag joins, gap%. POST includes `portfolio_id` in body. PUT updates target/notes/tags by id. DELETE removes by id. |
| `/api/signals` | GET | Filters by `?portfolio_id=`; returns `Record<ticker, Signal>`. |
| `/api/generate-signals` | POST | Body: `{ holdings, watchlist, portfolio_total_mxn, portfolio_cash_mxn, portfolio_id, force_all }`. Loops through items, skips existing if `force_all=false`, fetches news, calls Claude Sonnet with 500ms between tickers. Returns full signals map for the portfolio. |
| `/api/generate-description` | POST | Body: `{ ticker, name }`. Fetches Finnhub profile2 + 3 headlines → Claude Haiku → 2-sentence description stored in company_descriptions. No-ops if description already exists. |
| `/api/descriptions` | GET | Returns stored company descriptions. |
| `/api/prices` | GET | `?tickers=A,B,C` — returns live prices for arbitrary tickers. |
| `/api/news` | GET | `?ticker=X` or `?category=general` — Finnhub company news. |
| `/api/fx` | GET | Returns `{ rate, live }` — live from Finnhub OANDA, fallback Frankfurter, fallback 17.5. |
| `/api/crypto` | GET | ADA/USD from CoinGecko. |
| `/api/search` | GET | Ticker autocomplete via Finnhub symbol search. |
| `/api/tags` | GET, POST, PUT, DELETE | Global tag CRUD (not portfolio-scoped). |
| `/api/industry` | GET | Fetches Finnhub `profile2.finnhubIndustry` for a ticker; stores in company_descriptions. |
| `/api/price-snapshot` | GET | Fetches opening price for autocomplete prefill only — **not** for P&L calculations. |
| `/api/profile` | GET | Fetches Finnhub company profile2. |

---

## Key Business Logic

### BUY flow (`/api/buy`)
1. Check if `holdings` row exists for `(ticker, portfolio_id)`
2. Insert `trade_log` row with action `'BUY'`
3. Deduct cost from `cash_balance` (only if `initialized = 1`)
4. **If existing**: update bucket/conviction/thesis metadata, then `recalculateHolding` (recomputes weighted avg)
5. **If new**: directly INSERT holdings row (no recalculate needed — first trade sets the price)
6. All steps in one transaction

### SELL flow (`/api/sell`)
1. Validate holding exists and `shares ≤ holding.shares`
2. Insert `trade_log` row with action `'SELL'` and `realized_pnl_mxn`
3. Credit proceeds to `cash_balance`
4. Call `recalculateHolding` — removes holding row if net shares ≤ 0
5. All steps in one transaction

### Cash balance rules
- Cash is **never** recalculated from scratch — always delta updates (`amount + ?`)
- BUY: `amount -= shares × price_mxn`
- SELL: `amount += shares × price_mxn`
- On first `PUT /api/cash` (`initialized=0`): stored amount = entered amount − Σ(existing holdings cost)
- Cash updates only run if `initialized = 1` for BUY; SELL always credits regardless

### Price fetching
- All prices are in **MXN** — no USD in any calculation
- `getFxRate()` in `src/lib/prices.ts` checks `fx_cache` (15 min TTL) before hitting Finnhub
- `.MX` tickers (e.g. `GOOG.MX`): strip suffix, fetch base US price, multiply by FX rate — handled automatically by `fetchBatchQuotes`
- `price_snapshot` (`/api/price-snapshot`) is cosmetic only — used to prefill price inputs in forms; never used in P&L math

### Signal generation refresh schedule (in `src/app/page.tsx`)
- On first portfolio load: generate signals for any ticker with no existing signal
- Auto-refresh: every 60 min if market hours (9:30–16:00 CT weekdays) or 8:30–8:45 AM CT
- Manual: global Refresh button in Header dispatches `portfolio-refresh` event
- Portfolio switch: resets `signalsInitRef` so signals regenerate fresh for the new portfolio

### Stop-loss thresholds (`src/lib/calculations.ts`)
```
very-high → 18% below entry
high      → 18% below entry
medium    → 12% below entry
speculative → 30% below entry
```

---

## Design System

### CSS Custom Properties (`src/app/globals.css`)

```css
--bg: #000000          /* page background */
--surface: #0a0a0a     /* panels, cards */
--surface2: #0d0d0d    /* nested surfaces, modal bodies */
--border: #1a1a1a      /* default border */
--border2: #333333     /* stronger border, modal borders */
--accent: #ff8c00      /* Bloomberg orange — primary interactive color */
--accent-bg: #1a1100   /* orange-tinted background for section headers */
--positive: #00c853    /* gains, BUY */
--negative: #ff1744    /* losses, SELL, danger */
--text: #e0e0e0        /* primary text */
--text-dim: #888888    /* secondary text, labels */
--text-ticker: #ffffff /* ticker symbols — always white bold */
--hover: #111100       /* table row hover */
--muted: #555555       /* placeholder/empty states */
```

**CSS classes to use** (never inline equivalent styles):
- `.btn`, `.btn-primary`, `.btn-danger`, `.btn-success`, `.btn-buy`, `.btn-sell`
- `.section-header` — orange top-border bar used as section titles
- `.data-table` — all tabular data
- `.modal-overlay`, `.modal`, `.modal-header`, `.modal-body`, `.modal-footer`
- `.form-group`, `.form-label`, `.form-input`, `.form-select`, `.form-textarea`
- `.badge` — inline label pills (colored via inline `color`/`borderColor`)
- `.card` — surface panel with border
- `.signal-pulse` — CSS animation for loading skeleton

### Typography
- IBM Plex Mono exclusively — `var(--font-mono)` — at all sizes
- Section headers: 11px, 700 weight, uppercase, letter-spacing 0.12em
- Table headers: 10px, 700, uppercase, letter-spacing 0.1em
- Table data: 12px
- Tickers: 13px, white (`var(--text-ticker)`), bold
- `border-radius: 0 !important` on everything (enforced globally in globals.css)

### Layout conventions
- Numbers right-aligned (`.right` class on `th`/`td`)
- Labels left-aligned
- Gap between dashboard sections: 16px padding in flex column
- Portfolio tabs bar: 33px height, black background, orange active tab with 2px solid bottom border

---

## ALWAYS / NEVER

### Always
- `export const dynamic = 'force-dynamic'` on every API route that returns live or DB data
- Wrap any multi-table DB operation in `db.transaction(() => { ... })()`
- Filter every portfolio-scoped query with `WHERE portfolio_id = ?`
- Use `recalculateHolding(db, ticker, portfolioId)` from `src/lib/recalculate.ts` after any trade insert/update/delete — never update holdings directly
- Filter trade queries with `AND deleted = 0` unless the intent is to show deleted trades
- Call `window.dispatchEvent(new Event('cash-update'))` from client after any buy/sell/trade mutation so `CashBalance` component refreshes
- Scope Finnhub calls sequentially with 200ms delay — use `fetchBatchQuotes` from `src/lib/finnhub.ts`
- Use `await params` for dynamic route segments (Next.js 15+ pattern): `{ params }: { params: Promise<{ id: string }> }`
- Pass `portfolioId` as a prop to `BuyModal`, `SellModal`, `CashBalance`, `DashboardWatchlist`, `AddWatchlistModal`

### Never
- Call any external API (Finnhub, CoinGecko, Anthropic, Frankfurter) from a client component — server-side only
- Use USD in portfolio calculations — all P&L, cost basis, and value math is in MXN
- Use `price_snapshot` for P&L or position value — it is for autocomplete prefill only
- Use `USD/MXN` FX rate in P&L calculations — it is cosmetic only (displayed in header)
- Hard-delete trade_log rows — always soft delete (`deleted = 1`, `deleted_at = now()`)
- Allow a SELL that would result in negative shares — validate `shares ≤ holding.shares` before transacting
- Delete the last remaining portfolio — `portfolios/[id]` DELETE blocks if `COUNT(*) ≤ 1`
- Add border-radius, box-shadow, or gradients anywhere — `border-radius: 0 !important` is global
- Hardcode color values inline when a CSS variable exists
- Use any font other than IBM Plex Mono
- Mix data between portfolios — every query on a portfolio-scoped table must include `portfolio_id`
- Regenerate a company description if one already exists in `company_descriptions`
- Fire parallel Finnhub calls — always sequential with 200ms gap

### Common mistakes to avoid
- Forgetting `portfolio_id` in a new API route — check both the query filter AND any INSERT
- Using `id = 1` in cash_balance queries (old single-portfolio schema) — the PK is now `portfolio_id`
- Calling `recalculateHolding` without wrapping the entire transaction including the trade INSERT
- Writing to `holdings` directly instead of via `recalculateHolding` for share count / avg price
- Forgetting to reset `signalsInitRef.current = false` when switching portfolios
- Missing `export const dynamic = 'force-dynamic'` on a new route that queries the DB
