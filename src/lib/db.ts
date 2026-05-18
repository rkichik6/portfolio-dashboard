import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'portfolio.db');

let db: Database.Database;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function tableExists(name: string): boolean {
  return !!db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(name);
}

function hasColumn(table: string, col: string): boolean {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return cols.some(c => c.name === col);
}

function migrateToMultiPortfolio() {
  // 1. portfolios table
  db.exec(`
    CREATE TABLE IF NOT EXISTS portfolios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    INSERT OR IGNORE INTO portfolios (id, name) VALUES (1, 'Main Portfolio');
  `);

  // 2. holdings — recreate with UNIQUE(portfolio_id, ticker)
  if (tableExists('holdings') && !hasColumn('holdings', 'portfolio_id')) {
    db.transaction(() => {
      db.exec(`
        ALTER TABLE holdings RENAME TO _holdings_old;
        CREATE TABLE holdings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          portfolio_id INTEGER NOT NULL DEFAULT 1,
          ticker TEXT NOT NULL,
          name TEXT NOT NULL,
          shares REAL NOT NULL,
          entry_price_mxn REAL NOT NULL,
          entry_date TEXT NOT NULL,
          bucket TEXT NOT NULL DEFAULT 'core',
          conviction TEXT NOT NULL DEFAULT 'high',
          thesis TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(portfolio_id, ticker)
        );
        INSERT INTO holdings
          SELECT id, 1, ticker, name, shares, entry_price_mxn, entry_date, bucket, conviction, thesis, created_at, updated_at
          FROM _holdings_old;
        DROP TABLE _holdings_old;
      `);
    })();
  }

  // 3. watchlist — recreate with UNIQUE(portfolio_id, ticker)
  if (tableExists('watchlist') && !hasColumn('watchlist', 'portfolio_id')) {
    db.transaction(() => {
      db.exec(`
        ALTER TABLE watchlist RENAME TO _watchlist_old;
        CREATE TABLE watchlist (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          portfolio_id INTEGER NOT NULL DEFAULT 1,
          ticker TEXT NOT NULL,
          name TEXT NOT NULL,
          target_price_mxn REAL,
          notes TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(portfolio_id, ticker)
        );
        INSERT INTO watchlist
          SELECT id, 1, ticker, name, target_price_mxn, notes, created_at
          FROM _watchlist_old;
        DROP TABLE _watchlist_old;
      `);
    })();
  }

  // 4. trade_log — simple ADD COLUMN
  if (tableExists('trade_log') && !hasColumn('trade_log', 'portfolio_id')) {
    db.exec(`ALTER TABLE trade_log ADD COLUMN portfolio_id INTEGER NOT NULL DEFAULT 1`);
  }

  // 5. cash_balance — recreate with portfolio_id as PK
  if (tableExists('cash_balance') && !hasColumn('cash_balance', 'portfolio_id')) {
    db.transaction(() => {
      db.exec(`
        ALTER TABLE cash_balance RENAME TO _cash_balance_old;
        CREATE TABLE cash_balance (
          portfolio_id INTEGER PRIMARY KEY,
          amount REAL NOT NULL DEFAULT 0,
          initialized INTEGER NOT NULL DEFAULT 0,
          last_updated TEXT DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO cash_balance (portfolio_id, amount, initialized, last_updated)
          SELECT 1, amount, COALESCE(initialized, 0), last_updated FROM _cash_balance_old WHERE id = 1;
        DROP TABLE _cash_balance_old;
      `);
    })();
    db.exec(`INSERT OR IGNORE INTO cash_balance (portfolio_id, amount) VALUES (1, 0);`);
  }

  // 6. signals — recreate with PRIMARY KEY (ticker, portfolio_id)
  if (tableExists('signals') && !hasColumn('signals', 'portfolio_id')) {
    db.transaction(() => {
      db.exec(`
        ALTER TABLE signals RENAME TO _signals_old;
        CREATE TABLE signals (
          ticker TEXT NOT NULL,
          portfolio_id INTEGER NOT NULL DEFAULT 1,
          signal_direction TEXT NOT NULL,
          signal_strength INTEGER NOT NULL,
          sentiment TEXT NOT NULL,
          sentiment_strength INTEGER NOT NULL,
          reasoning TEXT,
          generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (ticker, portfolio_id)
        );
        INSERT INTO signals
          SELECT ticker, 1, signal_direction, signal_strength, sentiment, sentiment_strength, reasoning, generated_at
          FROM _signals_old;
        DROP TABLE _signals_old;
      `);
    })();
  }
}

function initSchema() {
  // Multi-portfolio migration first (safe no-op if already done or fresh install)
  migrateToMultiPortfolio();

  db.exec(`
    CREATE TABLE IF NOT EXISTS portfolios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    INSERT OR IGNORE INTO portfolios (id, name) VALUES (1, 'Main Portfolio');

    CREATE TABLE IF NOT EXISTS holdings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      portfolio_id INTEGER NOT NULL DEFAULT 1,
      ticker TEXT NOT NULL,
      name TEXT NOT NULL,
      shares REAL NOT NULL,
      entry_price_mxn REAL NOT NULL,
      entry_date TEXT NOT NULL,
      bucket TEXT NOT NULL DEFAULT 'core',
      conviction TEXT NOT NULL DEFAULT 'high',
      thesis TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(portfolio_id, ticker)
    );

    CREATE TABLE IF NOT EXISTS watchlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      portfolio_id INTEGER NOT NULL DEFAULT 1,
      ticker TEXT NOT NULL,
      name TEXT NOT NULL,
      target_price_mxn REAL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(portfolio_id, ticker)
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#00d4ff'
    );

    CREATE TABLE IF NOT EXISTS watchlist_tags (
      watchlist_id INTEGER REFERENCES watchlist(id) ON DELETE CASCADE,
      tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (watchlist_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS trade_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      portfolio_id INTEGER NOT NULL DEFAULT 1,
      ticker TEXT NOT NULL,
      name TEXT NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('BUY', 'SELL')),
      shares REAL NOT NULL,
      price_mxn REAL NOT NULL,
      total_mxn REAL NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      realized_pnl_mxn REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS price_cache (
      ticker TEXT PRIMARY KEY,
      price_usd REAL NOT NULL,
      price_mxn REAL NOT NULL,
      change_pct REAL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS fx_cache (
      pair TEXT PRIMARY KEY,
      rate REAL NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cash_balance (
      portfolio_id INTEGER PRIMARY KEY,
      amount REAL NOT NULL DEFAULT 0,
      initialized INTEGER NOT NULL DEFAULT 0,
      last_updated TEXT DEFAULT CURRENT_TIMESTAMP
    );

    INSERT OR IGNORE INTO cash_balance (portfolio_id, amount) VALUES (1, 0);

    CREATE TABLE IF NOT EXISTS company_descriptions (
      ticker TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS signals (
      ticker TEXT NOT NULL,
      portfolio_id INTEGER NOT NULL DEFAULT 1,
      signal_direction TEXT NOT NULL,
      signal_strength INTEGER NOT NULL,
      sentiment TEXT NOT NULL,
      sentiment_strength INTEGER NOT NULL,
      reasoning TEXT,
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (ticker, portfolio_id)
    );
  `);

  // company_descriptions.industry column
  const descCols = db.prepare('PRAGMA table_info(company_descriptions)').all() as { name: string }[];
  if (!descCols.some(c => c.name === 'industry')) {
    db.exec('ALTER TABLE company_descriptions ADD COLUMN industry TEXT');
  }

  // trade_log soft delete columns
  const tradeCols = db.prepare('PRAGMA table_info(trade_log)').all() as { name: string }[];
  if (!tradeCols.some(c => c.name === 'deleted')) {
    db.exec('ALTER TABLE trade_log ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0');
  }
  if (!tradeCols.some(c => c.name === 'deleted_at')) {
    db.exec('ALTER TABLE trade_log ADD COLUMN deleted_at TEXT');
  }

  seedData();

  // One-time fix: reconstruct GOOG.MX holding if trade history exists but no holdings row
  const googHolding = db.prepare('SELECT id FROM holdings WHERE ticker = ? AND portfolio_id = 1').get('GOOG.MX');
  if (!googHolding) {
    type TF = { action: string; shares: number; price_mxn: number; name: string; date: string };
    const gTrades = db.prepare(
      `SELECT action, shares, price_mxn, name, date FROM trade_log
       WHERE ticker = 'GOOG.MX' AND portfolio_id = 1 AND deleted = 0
       ORDER BY date ASC, created_at ASC`
    ).all() as TF[];

    let netShares = 0, netCost = 0;
    for (const t of gTrades) {
      if (t.action === 'BUY') {
        netShares += t.shares;
        netCost += t.shares * t.price_mxn;
      } else {
        const avg = netShares > 0 ? netCost / netShares : 0;
        netShares -= t.shares;
        netCost -= t.shares * avg;
      }
    }

    if (netShares > 0.0001) {
      const firstBuy = gTrades.find(t => t.action === 'BUY');
      db.prepare(`
        INSERT OR IGNORE INTO holdings
          (portfolio_id, ticker, name, shares, entry_price_mxn, entry_date, bucket, conviction, thesis, updated_at)
        VALUES (1, 'GOOG.MX', ?, ?, ?, ?, 'core', 'high', null, datetime('now'))
      `).run(
        firstBuy?.name ?? 'Alphabet Inc.',
        netShares,
        netShares > 0 ? netCost / netShares : 0,
        firstBuy?.date ?? new Date().toISOString().slice(0, 10)
      );
    }
  }
}

function seedData() {
  const insertTag = db.prepare(`INSERT OR IGNORE INTO tags (name, color) VALUES (?, ?)`);
  const tags = [
    ['Waiting for Pullback', '#ffb800'],
    ['To Buy List', '#00ff9d'],
    ['Speculative', '#ff3d5a'],
    ['Earnings Play', '#a78bfa'],
    ['Long Term', '#00d4ff'],
    ['High Conviction', '#f97316'],
  ];
  for (const [name, color] of tags) {
    insertTag.run(name, color);
  }

  const insertHolding = db.prepare(`
    INSERT OR IGNORE INTO holdings (portfolio_id, ticker, name, shares, entry_price_mxn, entry_date, bucket, conviction, thesis)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const holdings = [
    ['PLTR', 'Palantir Technologies', 23, 2320, '2026-05-12', 'core', 'very-high', 'AI defense anchor. Q1 revenue up 85% YoY — fastest growth in company history.'],
    ['ALAB', 'Astera Labs', 8, 3400, '2026-05-12', 'core', 'high', 'AI data center connectivity chips. Q1 EPS beat by 238%. Revenue up 93% YoY.'],
    ['BBAI', 'BigBear.ai', 400, 72.43, '2026-05-12', 'swing', 'speculative', 'Speculative AI analytics play. High risk, high reward if AI defense contracts accelerate.'],
    ['SOUN', 'SoundHound AI', 150, 143.00, '2026-05-12', 'swing', 'high', 'Voice AI platform. Nvidia partnership adds credibility. Real revenue growth.'],
    ['QBTS', 'D-Wave Quantum', 50, 412.17, '2026-05-12', 'swing', 'speculative', 'Only dual-platform quantum company. Bookings up 1,994% YoY. Investor Day June 1.'],
    ['RGTI', 'Rigetti Computing', 25, 349.44, '2026-05-12', 'swing', 'speculative', 'Quantum pure play. Q1 revenue up 193% YoY. Small speculative bet.'],
  ];
  for (const h of holdings) {
    insertHolding.run(...h);
  }

  const insertTrade = db.prepare(`
    INSERT OR IGNORE INTO trade_log (portfolio_id, ticker, name, action, shares, price_mxn, total_mxn, date, notes)
    SELECT 1, ?, ?, 'BUY', ?, ?, ?, ?, 'Initial portfolio position'
    WHERE NOT EXISTS (SELECT 1 FROM trade_log WHERE ticker = ? AND portfolio_id = 1 AND action = 'BUY')
  `);
  for (const h of holdings) {
    const [ticker, name, shares, price] = h as [string, string, number, number, ...unknown[]];
    insertTrade.run(ticker, name, shares, price, shares * price, '2026-05-12', ticker);
  }

  const insertWatchlist = db.prepare(`
    INSERT OR IGNORE INTO watchlist (portfolio_id, ticker, name, target_price_mxn, notes)
    VALUES (1, ?, ?, ?, ?)
  `);
  const watchlist = [
    ['TSM', 'TSMC', 7021, 'Backbone of AI chips. 72% market share. Waiting for pullback.'],
    ['IONQ', 'IonQ', 861, 'Best quantum fundamentals. Ran too hard post-earnings.'],
    ['CRWV', 'CoreWeave', 1893, 'Pure-play AI cloud. $100B backlog. Post-earnings drift.'],
    ['EMBJ', 'Embraer', 1000, 'Aerospace/defense opportunistic. Record backlog.'],
    ['CBRS', 'Cerebras', 2250, 'AI chip IPO. Wait for post-IPO pullback.'],
    ['QUBT', 'Quantum Computing Inc', 198, 'Photonics quantum play. Wait for pullback to $11.50 USD.'],
    ['MRVL', 'Marvell Technology', 2741, 'AI chips. Monitor for re-entry opportunity.'],
  ];
  for (const w of watchlist) {
    insertWatchlist.run(...w);
  }
}

export default getDb;
